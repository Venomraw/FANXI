from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.schemas import Prediction
from app.db import get_session
from app.models import PredictionDB
from app.api.predictions import to_prediction_model

router = APIRouter(
    prefix="/users",
    tags=["users"],
)


@router.get("/{username}/predictions", response_model=list[Prediction])
def list_predictions_for_user(
    username: str,
    session: Session = Depends(get_session),
):
    """
    Return all predictions made by a given user.
    Matching is case-sensitive for now; client should send consistent usernames.
    """
    username_clean = username.strip()

    result = session.exec(
        select(PredictionDB).where(PredictionDB.username == username_clean)
    )
    rows = result.all()

    return [to_prediction_model(row) for row in rows]
