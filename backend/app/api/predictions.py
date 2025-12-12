from datetime import datetime

from fastapi import APIRouter, HTTPException

from app.schemas import Prediction, PredictionInput

router = APIRouter(
    prefix="/matches",
    tags=["predictions"],
)

# Super simple in-memory store for now
PREDICTIONS: list[Prediction] = []


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
