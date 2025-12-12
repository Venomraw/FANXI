from fastapi import APIRouter

from app.schemas import Prediction
from app.api.predictions import PREDICTIONS

router = APIRouter(
    prefix="/users",
    tags=["users"],
)


@router.get("/{username}/predictions", response_model=list[Prediction])
def list_predictions_for_user(username: str):
    """
    Return all predictions made by a given user (case-insensitive match).
    """
    username_normalized = username.strip().lower()

    user_predictions = [
        p
        for p in PREDICTIONS
        if p.username.strip().lower() == username_normalized
    ]

    return user_predictions
