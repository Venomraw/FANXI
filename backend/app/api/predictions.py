from datetime import datetime

from fastapi import APIRouter, HTTPException

from app.schemas import Prediction, PredictionInput, PredictionScore

router = APIRouter(
    prefix="/matches",
    tags=["predictions"],
)

# Super simple in-memory store for now
PREDICTIONS: list[Prediction] = []

# Mock "official" starting XI per match_id (for now, only match 1)
OFFICIAL_LINEUPS: dict[int, list[str]] = {
    1: [
        "Ter Stegen",
        "Kounde",
        "Araujo",
        "Christensen",
        "Balde",
        "Gundogan",
        "Pedri",
        "Frenkie de Jong",
        "Yamal",
        "Lewandowski",
        "Raphinha",
    ]
}
def score_single_prediction(prediction: Prediction, official_players: list[str]) -> PredictionScore:
    """
    Compare a prediction's players to the official lineup and return a score object.
    Order does NOT matter; we just count how many names match.
    """
    # case-insensitive, ignore extra spaces
    official_set = {p.strip().lower() for p in official_players}
    predicted_set = {p.strip().lower() for p in prediction.players}

    correct = len(official_set & predicted_set)
    score_value = correct  # 1 point per correct player for now

    return PredictionScore(
        prediction_id=prediction.id,
        match_id=prediction.match_id,
        username=prediction.username,
        correct_players=correct,
        total_players=len(official_players),
        score=score_value,
    )



@router.post("/{match_id}/predictions", response_model=Prediction, status_code=201)
def create_prediction(match_id: int, payload: PredictionInput):
    """
    Let a fan submit a lineup prediction for a match.
    """
    # tiny validation: exactly 11 players
    if len(payload.players) != 11:
        raise HTTPException(
            status_code=400,
            detail="Prediction must contain exactly 11 players.",
        )

    new_id = len(PREDICTIONS) + 1

    prediction = Prediction(
        id=new_id,
        username=payload.username,
        team_id=payload.team_id,
        # trust the path param for match_id
        match_id=match_id,
        formation=payload.formation,
        players=payload.players,
        created_at=datetime.utcnow(),
    )

    PREDICTIONS.append(prediction)
    return prediction


@router.get("/{match_id}/predictions", response_model=list[Prediction])
def list_predictions_for_match(match_id: int):
    """
    List all predictions submitted for a given match.
    """
    return [p for p in PREDICTIONS if p.match_id == match_id]
@router.get("/{match_id}/scores", response_model=list[PredictionScore])
def list_scores_for_match(match_id: int):
    """
    Score all predictions for a match against the official lineup
    and return a simple leaderboard.
    """
    if match_id not in OFFICIAL_LINEUPS:
        raise HTTPException(
            status_code=404,
            detail="No official lineup found for this match.",
        )

    official_players = OFFICIAL_LINEUPS[match_id]

    # filter predictions for this match
    match_predictions = [p for p in PREDICTIONS if p.match_id == match_id]

    scores = [
        score_single_prediction(p, official_players)
        for p in match_predictions
    ]

    # sort best first (highest score), then by username to keep it stable
    scores.sort(key=lambda s: (-s.score, s.username.lower()))

    return scores

