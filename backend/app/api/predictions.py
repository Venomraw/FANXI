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
