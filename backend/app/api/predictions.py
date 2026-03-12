import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, List

from fastapi import APIRouter, HTTPException, Depends, Request, status
from sqlmodel import Session, select
from app.limiter import limiter

from app.db import get_session
from app.models import MatchPrediction, User
from app.schemas import LockSelectionRequest, LeaderboardEntry, MatchResultInput
from app.api.users import get_current_user

# Module-level logger — errors are written to the server log, never to HTTP
# responses, so internal details are never exposed to clients.
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/predictions",
    tags=["predictions"],
)

# ---------------------------------------------------------------------------
# Scoring helpers
#
# These are imported by web.py to score HTML-form predictions against the
# real post-match lineup.  They live here because predictions.py owns all
# scoring logic; web.py is purely a presentation layer.
# ---------------------------------------------------------------------------

# OFFICIAL_LINEUPS maps a match_id to the list of 11 player names that
# actually started the match.  Populated manually (or via an admin endpoint)
# once the real lineup is confirmed.  Empty dict = no scoring yet for any match.
# Example: { 1: ["L. Messi", "A. Di Maria", ...] }
OFFICIAL_LINEUPS: Dict[int, List[str]] = {}


@dataclass
class ScoreResult:
    """
    Result of scoring one prediction against the official lineup.
    - score           : percentage of correct players (0–100)
    - correct_players : number of names that matched
    - total_players   : size of the official lineup (denominator)
    """
    score: int
    correct_players: int
    total_players: int


def to_prediction_model(db_obj) -> dict:
    """
    Convert a PredictionDB row (HTML form submission) to a plain dict so
    score_single_prediction can work with it.

    PredictionDB stores players as a pipe-separated string to keep the DB
    schema simple for the HTML interface.  We split it back here.
    Example: "Messi|Ronaldo|Mbappe" -> ["Messi", "Ronaldo", "Mbappe"]
    """
    players = [p.strip() for p in db_obj.players_csv.split("|") if p.strip()]
    return {"players": players, "formation": db_obj.formation}


def score_single_prediction(prediction: dict, official_lineup: List[str]) -> ScoreResult:
    """
    Score a prediction against the official post-match lineup.

    Uses a set intersection so the comparison is order-independent and
    case-insensitive — "messi" and "Messi" both count as correct.

    Score formula: (correct / total) * 100, rounded down to an integer.
    """
    # Convert to lowercase sets for case-insensitive matching
    predicted = {p.lower() for p in prediction.get("players", [])}
    official = {p.lower() for p in official_lineup}

    correct = len(predicted & official)   # set intersection = exact matches
    total = len(official)
    score = int((correct / total) * 100) if total > 0 else 0

    return ScoreResult(score=score, correct_players=correct, total_players=total)


# ---------------------------------------------------------------------------
# Outcome scoring helpers
# ---------------------------------------------------------------------------

def _result_from_goals(home: int, away: int) -> str:
    """Derive 'home' | 'draw' | 'away' from final goal counts."""
    if home > away:
        return "home"
    if away > home:
        return "away"
    return "draw"


def score_match_result(predicted: str, home_goals: int, away_goals: int) -> int:
    """3 points for correct 1X2 result."""
    actual = _result_from_goals(home_goals, away_goals)
    return 3 if predicted == actual else 0


def score_correct_score(predicted: dict, home_goals: int, away_goals: int) -> int:
    """10 points for exact scoreline."""
    if predicted.get("home") == home_goals and predicted.get("away") == away_goals:
        return 10
    return 0


def score_btts(predicted: bool, home_goals: int, away_goals: int) -> int:
    """5 points if BTTS prediction matches reality."""
    actual = home_goals > 0 and away_goals > 0
    return 5 if predicted == actual else 0


def score_over_under(predicted: dict, home_goals: int, away_goals: int) -> int:
    """4 points for correct over/under pick."""
    total = home_goals + away_goals
    line = predicted.get("line", 2.5)
    pick = predicted.get("pick", "")
    if pick == "over" and total > line:
        return 4
    if pick == "under" and total < line:
        return 4
    return 0


def score_ht_ft(predicted: dict, ht_home: int, ht_away: int, ft_home: int, ft_away: int) -> int:
    """6 points for both HT and FT correct; 3 points for one correct."""
    actual_ht = _result_from_goals(ht_home, ht_away)
    actual_ft = _result_from_goals(ft_home, ft_away)
    ht_correct = predicted.get("ht") == actual_ht
    ft_correct = predicted.get("ft") == actual_ft
    if ht_correct and ft_correct:
        return 6
    if ht_correct or ft_correct:
        return 3
    return 0


# ---------------------------------------------------------------------------
# Player prediction scoring helpers
# ---------------------------------------------------------------------------

def score_first_goalscorer(predicted: str, actual_first_scorer: str) -> int:
    """10 points for correctly predicting the first goalscorer."""
    return 10 if predicted.lower() == actual_first_scorer.lower() else 0


def score_anytime_goalscorer(predicted: str, scorers: List[str]) -> int:
    """5 points if predicted player scored at any point in the match."""
    return 5 if predicted.lower() in {s.lower() for s in scorers} else 0


def score_player_assist(predicted: str, assisters: List[str]) -> int:
    """5 points if predicted player provided an assist."""
    return 5 if predicted.lower() in {a.lower() for a in assisters} else 0


def score_player_carded(predicted: str, carded: List[str]) -> int:
    """4 points if predicted player received a card."""
    return 4 if predicted.lower() in {c.lower() for c in carded} else 0


def score_shots_on_target(predicted: dict, player_shots: dict) -> int:
    """4 points if predicted player met or exceeded the shots-on-target threshold.

    player_shots maps player name (lower-case) -> shot count.
    """
    player = predicted.get("player", "").lower()
    threshold = predicted.get("threshold", 1)
    return 4 if player_shots.get(player, 0) >= threshold else 0


def score_man_of_the_match(predicted: str, actual_motm: str) -> int:
    """8 points for correctly predicting the man of the match."""
    return 8 if predicted.lower() == actual_motm.lower() else 0


# ---------------------------------------------------------------------------
# API endpoints
# ---------------------------------------------------------------------------

# 20/minute — a real user submits one prediction per match.
# 20/min catches accidental double-submits but blocks spam bots.
@router.post("/lock/{match_id}", status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def lock_prediction(
    request: Request,
    match_id: int,
    prediction_data: LockSelectionRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Save or overwrite a user's tactical lineup for a given match.

    If the user already has a prediction for this match it is updated
    (upsert behaviour) so they always have exactly one active prediction
    per match.  The lineup and tactics are stored as plain dicts (JSON)
    because the frontend sends a dynamic structure that varies by formation.
    """
    try:
        # Pydantic model instances are not JSON-serialisable by SQLite's JSON
        # column type, so we convert them to plain dicts first.
        clean_lineup = {
            pos: player.model_dump()
            for pos, player in prediction_data.lineup.items()
        }
        clean_tactics = prediction_data.tactics.model_dump()
        # Persist formation name alongside slider values so card generator can read it
        if prediction_data.formation:
            clean_tactics["formation"] = prediction_data.formation

        # Serialize outcomes (all 5 core outcome prediction fields)
        outcomes = prediction_data.outcomes
        clean_outcomes = outcomes.model_dump() if outcomes else {}

        # Serialize player predictions
        clean_players = (
            prediction_data.player_predictions.model_dump()
            if prediction_data.player_predictions else {}
        )

        # Check for an existing prediction to update (upsert)
        existing = session.exec(
            select(MatchPrediction).where(
                MatchPrediction.match_id == match_id,
                MatchPrediction.user_id == current_user.id,
                MatchPrediction.team_name == prediction_data.team_name,
            )
        ).first()

        if existing:
            # Update in place — preserves the same row id for leaderboard
            # references and keeps the history table tidy.
            existing.lineup_data = clean_lineup
            existing.tactics_data = clean_tactics
            existing.match_result = clean_outcomes.get("match_result")
            existing.btts_prediction = clean_outcomes.get("btts")
            existing.correct_score = clean_outcomes.get("correct_score")
            existing.over_under = clean_outcomes.get("over_under")
            existing.ht_ft = clean_outcomes.get("ht_ft")
            existing.player_predictions = clean_players or None
            existing.created_at = datetime.now(timezone.utc)
            new_prediction = existing
        else:
            new_prediction = MatchPrediction(
                user_id=current_user.id,
                match_id=match_id,
                team_name=prediction_data.team_name,
                lineup_data=clean_lineup,
                tactics_data=clean_tactics,
                match_result=clean_outcomes.get("match_result"),
                btts_prediction=clean_outcomes.get("btts"),
                correct_score=clean_outcomes.get("correct_score"),
                over_under=clean_outcomes.get("over_under"),
                ht_ft=clean_outcomes.get("ht_ft"),
                player_predictions=clean_players or None,
                status="LOCKED",
                created_at=datetime.now(timezone.utc),
            )
            session.add(new_prediction)

        session.commit()
        session.refresh(new_prediction)

        return {
            "status": "success",
            "message": "Tactical orders locked in!",
            "prediction_id": new_prediction.id,
        }

    except Exception as e:
        session.rollback()
        # Log the real error server-side for debugging, but return a generic
        # message to the client so internal DB details are never exposed.
        logger.error("DB error in lock_prediction (match=%s, user=%s): %s", match_id, current_user.id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again.",
        )


@router.get("/match/{match_id}")
def get_match_lineup(match_id: int, session: Session = Depends(get_session)):
    """
    Retrieve the locked lineup for a specific match.
    Returns the first prediction found for the match (pre-auth behaviour).
    """
    result = session.exec(
        select(MatchPrediction).where(MatchPrediction.match_id == match_id)
    ).first()

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No prediction found for this match.",
        )

    return result


@router.get("/history/{user_id}", response_model=List[MatchPrediction])
def get_prediction_history(user_id: int, session: Session = Depends(get_session)):
    """
    Fetch all saved tactical snapshots for a scout, newest first.
    Used by the History tab in PitchBoard.tsx to re-hydrate past lineups.
    Returns an empty list (not 404) when the user has no predictions yet.
    """
    results = session.exec(
        select(MatchPrediction)
        .where(MatchPrediction.user_id == user_id)
        .order_by(MatchPrediction.created_at.desc())
    ).all()

    return results


# ---------------------------------------------------------------------------
# Rank title helper
# ---------------------------------------------------------------------------

RANK_THRESHOLDS = [
    (1000, "Legend"),
    (600,  "Commander"),
    (300,  "Tactician"),
    (100,  "Analyst"),
    (0,    "Scout"),
]

def rank_title_for(points: int) -> str:
    for threshold, title in RANK_THRESHOLDS:
        if points >= threshold:
            return title
    return "Scout"


# ---------------------------------------------------------------------------
# Leaderboard
# ---------------------------------------------------------------------------

# 60/minute — read endpoint polled for live leaderboard updates.
# Once per second is plenty for real clients; blocks scrapers and hammering.
@router.get("/leaderboard", response_model=List[LeaderboardEntry])
@limiter.limit("60/minute")
def get_leaderboard(request: Request, session: Session = Depends(get_session)):
    """Return all users ranked by football_iq_points descending."""
    users = session.exec(
        select(User).order_by(User.football_iq_points.desc())
    ).all()

    return [
        LeaderboardEntry(
            rank=i + 1,
            username=u.username,
            country_allegiance=u.country_allegiance,
            football_iq_points=u.football_iq_points,
            rank_title=u.rank_title,
        )
        for i, u in enumerate(users)
    ]


# ---------------------------------------------------------------------------
# Admin: submit real match result → score all predictions → award IQ points
# ---------------------------------------------------------------------------

@router.post("/admin/score/{match_id}")
def score_match(
    match_id: int,
    result: MatchResultInput,
    session: Session = Depends(get_session),
):
    """
    Admin endpoint: submit the real result for a match.
    Scores every locked prediction for that match and awards IQ points to users.
    """
    predictions = session.exec(
        select(MatchPrediction).where(
            MatchPrediction.match_id == match_id,
            MatchPrediction.status == "LOCKED",
        )
    ).all()

    if not predictions:
        raise HTTPException(status_code=404, detail="No locked predictions for this match.")

    scored = []
    for pred in predictions:
        pts = 0

        # Match result
        if pred.match_result:
            pts += score_match_result(pred.match_result, result.home_goals, result.away_goals)

        # Correct score
        if pred.correct_score:
            pts += score_correct_score(pred.correct_score, result.home_goals, result.away_goals)

        # BTTS
        if pred.btts_prediction is not None:
            pts += score_btts(pred.btts_prediction, result.home_goals, result.away_goals)

        # Over/under
        if pred.over_under:
            pts += score_over_under(pred.over_under, result.home_goals, result.away_goals)

        # HT/FT
        if pred.ht_ft:
            pts += score_ht_ft(
                pred.ht_ft,
                result.ht_home_goals, result.ht_away_goals,
                result.home_goals, result.away_goals,
            )

        # Player predictions
        pp = pred.player_predictions or {}
        if pp.get("first_goalscorer") and result.first_goalscorer:
            pts += score_first_goalscorer(pp["first_goalscorer"], result.first_goalscorer)
        if pp.get("anytime_goalscorer") and result.scorers:
            pts += score_anytime_goalscorer(pp["anytime_goalscorer"], result.scorers)
        if pp.get("player_assist") and result.assisters:
            pts += score_player_assist(pp["player_assist"], result.assisters)
        if pp.get("player_carded") and result.carded:
            pts += score_player_carded(pp["player_carded"], result.carded)
        if pp.get("shots_on_target") and result.player_shots:
            pts += score_shots_on_target(pp["shots_on_target"], result.player_shots)
        if pp.get("man_of_the_match") and result.man_of_the_match:
            pts += score_man_of_the_match(pp["man_of_the_match"], result.man_of_the_match)

        # Mark prediction as scored
        pred.status = "SCORED"
        session.add(pred)

        # Award IQ points to user
        if pred.user_id:
            user = session.get(User, pred.user_id)
            if user:
                user.football_iq_points += pts
                user.rank_title = rank_title_for(user.football_iq_points)
                session.add(user)

        scored.append({"prediction_id": pred.id, "user_id": pred.user_id, "points_awarded": pts})

    session.commit()
    return {"match_id": match_id, "scored": len(scored), "results": scored}


# ---------------------------------------------------------------------------
# Post-match score reveal — full player comparison + breakdown
# ---------------------------------------------------------------------------

@router.get("/matches/{match_id}/score-reveal")
@limiter.limit("30/minute")
def score_reveal(
    request: Request,
    match_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Full post-match reveal: player-by-player comparison, IQ breakdown, rank.
    Used by the cinematic score reveal overlay on the live match page.
    """
    from app.services import football_data as _fd

    pred = session.exec(
        select(MatchPrediction).where(
            MatchPrediction.match_id == match_id,
            MatchPrediction.user_id == current_user.id,
        )
    ).first()
    if not pred:
        raise HTTPException(status_code=404, detail="No prediction found for this match")

    stats    = _fd.get_match_stats(match_id)
    lineups  = _fd.get_match_lineups(match_id)
    events   = _fd.get_match_events(match_id)

    score_data   = stats.get("score", {})
    home_goals   = score_data.get("home") or 0
    away_goals   = score_data.get("away") or 0
    match_status = stats.get("status", "")

    # Which side did the user predict?
    team_name = (pred.team_name or "").lower()
    home_name = stats.get("home_team", "").lower()
    is_home   = bool(team_name and (team_name in home_name or home_name in team_name))
    actual_lu = lineups.get("home" if is_home else "away") or {}
    actual_starters = {
        (p.get("name") or "").lower()
        for p in actual_lu.get("startXI", [])
    }
    actual_formation   = actual_lu.get("formation")
    predicted_formation = (pred.tactics_data or {}).get("formation", "")

    # Player-by-player comparison
    players_compared: list[dict] = []
    for slot, player in (pred.lineup_data or {}).items():
        if isinstance(player, dict) and player.get("name"):
            nm = player["name"]
            players_compared.append({
                "slot": slot,
                "name": nm,
                "position": player.get("position", ""),
                "correct": (nm.lower() in actual_starters) if actual_starters else None,
            })

    correct_count   = sum(1 for p in players_compared if p["correct"])
    total_predicted = len(players_compared)
    accuracy_pct    = int((correct_count / total_predicted) * 100) if total_predicted else 0

    # Scoring
    total_pts = 0

    # Formation: ≥7 correct = earned the formation pts
    formation_pts = 0
    if actual_starters and correct_count >= 7:
        formation_pts = 10
        total_pts += formation_pts

    # Captain / first scorer
    captain_pts = 0
    first_scorer_pts = 0
    captain_correct = False
    pp = pred.player_predictions or {}
    first_scorer_pick = (pp.get("first_goalscorer") or "").lower()
    goals_timeline   = [e for e in events if e.get("type") == "goal"]
    actual_first_scorer = (goals_timeline[0].get("scorer") or "").lower() if goals_timeline else None
    if first_scorer_pick and actual_first_scorer and first_scorer_pick == actual_first_scorer:
        captain_pts      = 20
        first_scorer_pts = 25
        captain_correct  = True
        total_pts += captain_pts + first_scorer_pts

    # Result
    result_pts     = 0
    result_correct = None
    if pred.match_result and match_status == "FINISHED":
        if home_goals > away_goals:
            actual_result = "home"
        elif away_goals > home_goals:
            actual_result = "away"
        else:
            actual_result = "draw"
        result_correct = pred.match_result == actual_result
        if result_correct:
            result_pts = 15
            total_pts += result_pts

    # Clean sheet
    clean_sheet_pts = 0
    if match_status == "FINISHED":
        if is_home and away_goals == 0:
            clean_sheet_pts = 15
            total_pts += clean_sheet_pts
        elif not is_home and home_goals == 0:
            clean_sheet_pts = 15
            total_pts += clean_sheet_pts

    # Rank
    all_users     = session.exec(select(User).order_by(User.football_iq_points.desc())).all()
    current_rank  = next((i + 1 for i, u in enumerate(all_users) if u.id == current_user.id), None)
    total_scouts  = len(all_users)
    better_than_pct = int(
        ((total_scouts - (current_rank or total_scouts)) / max(total_scouts, 1)) * 100
    )

    return {
        "match_id":     match_id,
        "match_status": match_status,
        "home_team":    stats.get("home_team", ""),
        "away_team":    stats.get("away_team", ""),
        "home_score":   home_goals,
        "away_score":   away_goals,
        "comparison": {
            "correct_count":      correct_count,
            "total_predicted":    total_predicted,
            "accuracy_pct":       accuracy_pct,
            "players":            players_compared,
            "formation_match":    bool(
                actual_formation and predicted_formation
                and actual_formation == predicted_formation
            ),
            "predicted_formation": predicted_formation,
            "actual_formation":    actual_formation,
        },
        "score_breakdown": {
            "formation_pts":    formation_pts,
            "captain_pts":      captain_pts,
            "first_scorer_pts": first_scorer_pts,
            "result_pts":       result_pts,
            "clean_sheet_pts":  clean_sheet_pts,
            "total_pts":        total_pts,
            "result_correct":   result_correct,
            "captain_correct":  captain_correct,
        },
        "rank": {
            "current_rank":    current_rank,
            "total_scouts":    total_scouts,
            "better_than_pct": better_than_pct,
        },
    }


# ---------------------------------------------------------------------------
# Live scorecard — compare user's prediction against current match reality
# ---------------------------------------------------------------------------

@router.get("/matches/{match_id}/my-score")
@limiter.limit("30/minute")
def live_my_score(
    request: Request,
    match_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Compare the authenticated user's pre-match prediction against
    current match state from football-data.org.

    Scoring:
      formation  : +10 pts if at least 7 of 11 players in lineup match the
                   real starting XI (best-effort without official lineup data)
      captain    : +20 pts if first_goalscorer pick matches a real goal scorer
      result     : +15 pts if match_result pick matches current score trend
                   (null while still live + equal score)
      first_scorer: +25 pts if first_goalscorer matches actual first goal
      clean_sheet: +15 pts if team has 0 goals against at current minute

    Returns null for unresolvable fields while match is live.
    """
    from app.services import football_data as _fd

    pred = session.exec(
        select(MatchPrediction).where(
            MatchPrediction.match_id == match_id,
            MatchPrediction.user_id == current_user.id,
        )
    ).first()

    if not pred:
        raise HTTPException(status_code=404, detail="No prediction found for this match")

    # Fetch live match data
    stats = _fd.get_match_stats(match_id)
    events = _fd.get_match_events(match_id)
    lineups = _fd.get_match_lineups(match_id)

    score = stats.get("score", {})
    home_goals = score.get("home") or 0
    away_goals = score.get("away") or 0
    status = stats.get("status", "")
    is_live = status in ("IN_PLAY", "PAUSED", "HALF_TIME")
    is_finished = status == "FINISHED"

    total_pts = 0

    # ── Formation check (vs confirmed lineup) ─────────────────────────────
    formation_correct = None
    formation_pts = 0
    home_lineup = lineups.get("home") or {}
    away_lineup = lineups.get("away") or {}
    confirmed_starters: set = set()
    for l in [home_lineup, away_lineup]:
        for p in l.get("startXI", []):
            name = (p.get("name") or "").lower()
            if name:
                confirmed_starters.add(name)

    if confirmed_starters:
        predicted_players = {
            (v.get("name") or "").lower()
            for v in (pred.lineup_data or {}).values()
            if isinstance(v, dict)
        }
        overlap = len(predicted_players & confirmed_starters)
        formation_correct = overlap >= 7
        if formation_correct:
            formation_pts = 10
            total_pts += formation_pts

    # ── Captain / first goalscorer ────────────────────────────────────────
    captain_correct = None
    captain_pts = 0
    pp = pred.player_predictions or {}
    first_scorer_pick = (pp.get("first_goalscorer") or "").lower()
    goals_timeline = [e for e in events if e["type"] == "goal"]
    actual_first_scorer = (
        (goals_timeline[0].get("scorer") or "").lower() if goals_timeline else None
    )
    all_scorers = {(e.get("scorer") or "").lower() for e in goals_timeline}

    if first_scorer_pick and actual_first_scorer:
        captain_correct = first_scorer_pick == actual_first_scorer
        if captain_correct:
            captain_pts = 20
            total_pts += captain_pts

    # ── Result ─────────────────────────────────────────────────────────────
    result_correct = None
    result_pts = 0
    if pred.match_result and (is_finished or (is_live and home_goals != away_goals)):
        if home_goals > away_goals:
            actual_result = "home"
        elif away_goals > home_goals:
            actual_result = "away"
        else:
            actual_result = "draw"
        if not is_finished and actual_result == "draw":
            result_correct = None  # still live — could change
        else:
            result_correct = pred.match_result == actual_result
            if result_correct:
                result_pts = 15
                total_pts += result_pts

    # ── First scorer +25 ──────────────────────────────────────────────────
    first_scorer_pts = 0
    if first_scorer_pick and actual_first_scorer and first_scorer_pick == actual_first_scorer:
        first_scorer_pts = 25
        total_pts += first_scorer_pts

    # ── Clean sheet ───────────────────────────────────────────────────────
    clean_sheet_pts = 0
    # Award if the user's team has a clean sheet so far
    team_name = (pred.team_name or "").lower()
    home_name = stats.get("home_team", "").lower()
    if team_name and team_name == home_name and away_goals == 0:
        clean_sheet_pts = 15
        total_pts += clean_sheet_pts
    elif team_name and team_name != home_name and home_goals == 0:
        clean_sheet_pts = 15
        total_pts += clean_sheet_pts

    # ── Current rank ──────────────────────────────────────────────────────
    all_users = session.exec(select(User).order_by(User.football_iq_points.desc())).all()
    current_rank = next(
        (i + 1 for i, u in enumerate(all_users) if u.id == current_user.id), None
    )
    total_scouts = len(all_users)

    return {
        "formation_correct": formation_correct,
        "formation_pts": formation_pts,
        "captain_correct": captain_correct,
        "captain_pts": captain_pts,
        "first_scorer_pts": first_scorer_pts,
        "result_correct": result_correct,
        "result_pts": result_pts,
        "clean_sheet_pts": clean_sheet_pts,
        "total_pts": total_pts,
        "current_rank": current_rank,
        "rank_change": 0,  # requires snapshot at kickoff — placeholder
        "total_scouts": total_scouts,
        "match_status": status,
        "home_goals": home_goals,
        "away_goals": away_goals,
    }
