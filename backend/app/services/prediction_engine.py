from typing import Dict, Optional
from app.models import MatchPrediction, MatchDB
from app.api.predictions import (
    score_match_result,
    score_correct_score,
    score_btts,
    score_over_under,
    score_ht_ft,
    score_first_goalscorer,
    score_anytime_goalscorer,
    score_player_assist,
    score_player_carded,
    score_shots_on_target,
    score_man_of_the_match,
)

# ---------------------------------------------------------------------------
# Points table
# ---------------------------------------------------------------------------

POINTS = {
    "match_result": 3,
    "correct_score": 10,
    "btts": 5,
    "over_under": 4,
    "ht_ft_both": 6,
    "ht_ft_one": 3,
}


# ---------------------------------------------------------------------------
# Outcome scoring orchestrator
# ---------------------------------------------------------------------------

def calculate_outcome_score(prediction: MatchPrediction, match: MatchDB) -> Dict:
    """
    Score all 5 core outcome predictions against real MatchDB result columns.

    Requires match.home_goals and match.away_goals to be populated (i.e. the
    match must be finished).  HT scoring additionally needs ht_home_goals and
    ht_away_goals.

    Returns a breakdown dict with a per-category score and the total.
    """
    if match.home_goals is None or match.away_goals is None:
        return {"error": "Match result not yet available", "total": 0}

    breakdown: Dict[str, int] = {}

    if prediction.match_result:
        breakdown["match_result"] = score_match_result(
            prediction.match_result, match.home_goals, match.away_goals
        )

    if prediction.correct_score:
        breakdown["correct_score"] = score_correct_score(
            prediction.correct_score, match.home_goals, match.away_goals
        )

    if prediction.btts_prediction is not None:
        breakdown["btts"] = score_btts(
            prediction.btts_prediction, match.home_goals, match.away_goals
        )

    if prediction.over_under:
        breakdown["over_under"] = score_over_under(
            prediction.over_under, match.home_goals, match.away_goals
        )

    if (
        prediction.ht_ft
        and match.ht_home_goals is not None
        and match.ht_away_goals is not None
    ):
        breakdown["ht_ft"] = score_ht_ft(
            prediction.ht_ft,
            match.ht_home_goals,
            match.ht_away_goals,
            match.home_goals,
            match.away_goals,
        )

    breakdown["total"] = sum(breakdown.values())
    return breakdown


# ---------------------------------------------------------------------------
# Player prediction scoring
# ---------------------------------------------------------------------------

def calculate_player_score(prediction: MatchPrediction, player_stats: Dict) -> Dict:
    """
    Score player-specific predictions against real post-match player stats.

    player_stats keys expected:
        first_scorer   : str        — name of player who scored first
        all_scorers    : List[str]  — all players who scored
        all_assisters  : List[str]  — all players with assists
        carded         : List[str]  — all players who received cards
        shots_on_target: Dict       — player_name_lower -> shot count
        motm           : str        — official man of the match name
    """
    pp = prediction.player_predictions or {}
    breakdown: Dict[str, int] = {}

    if pp.get("first_goalscorer") and player_stats.get("first_scorer"):
        breakdown["first_goalscorer"] = score_first_goalscorer(
            pp["first_goalscorer"], player_stats["first_scorer"]
        )
    if pp.get("anytime_goalscorer") and player_stats.get("all_scorers"):
        breakdown["anytime_goalscorer"] = score_anytime_goalscorer(
            pp["anytime_goalscorer"], player_stats["all_scorers"]
        )
    if pp.get("player_assist") and player_stats.get("all_assisters"):
        breakdown["player_assist"] = score_player_assist(
            pp["player_assist"], player_stats["all_assisters"]
        )
    if pp.get("player_carded") and player_stats.get("carded"):
        breakdown["player_carded"] = score_player_carded(
            pp["player_carded"], player_stats["carded"]
        )
    if pp.get("shots_on_target") and player_stats.get("shots_on_target"):
        breakdown["shots_on_target"] = score_shots_on_target(
            pp["shots_on_target"], player_stats["shots_on_target"]
        )
    if pp.get("man_of_the_match") and player_stats.get("motm"):
        breakdown["man_of_the_match"] = score_man_of_the_match(
            pp["man_of_the_match"], player_stats["motm"]
        )

    breakdown["total"] = sum(breakdown.values())
    return breakdown


# ---------------------------------------------------------------------------
# Tactical scoring
# ---------------------------------------------------------------------------

def calculate_tactical_score(prediction: MatchPrediction, real_stats: Dict) -> int:
    """
    Compare user tactical sliders to real post-match data.

    real_stats keys expected:
        actual_formation  : str  — e.g. "4-3-3"
        actual_pressing   : int  — 0–100 pressing intensity
    """
    score = 0

    tactics = prediction.tactics_data or {}

    if tactics.get("formation") == real_stats.get("actual_formation"):
        score += 20

    predicted_pressing = tactics.get("mentality", 50)
    diff = abs(predicted_pressing - real_stats.get("actual_pressing", 50))
    if diff <= 10:
        score += 30
    elif diff <= 25:
        score += 15

    return score
