from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select

from app.db import get_session
from app.models import MatchPrediction, User # Using our new World Cup models
# Note: You will update your schemas.py to include 'mentality' and 'pressing_intensity'
from app.schemas import PredictionInput, PredictionScore, MatchSummary

router = APIRouter(
    prefix="/matches",
    tags=["predictions"],
)

def calculate_tactical_bonus(prediction: MatchPrediction, real_tactics: dict) -> int:
    """
    The 'Tactical Haki': Calculates bonus points based on slider accuracy.
    """
    bonus = 0
    # Check if formation matches exactly
    if prediction.formation == real_tactics.get("formation"):
        bonus += 10
    
    # Proximity scoring for Pressing Intensity slider (0-100)
    diff = abs(prediction.pressing_intensity - real_tactics.get("pressing", 50))
    if diff <= 10: bonus += 20
    elif diff <= 25: bonus += 10
    
    return bonus

@router.post("/{match_id}/predictions")
def create_prediction(
    match_id: int,
    prediction_data: PredictionInput, # The Pydantic schema we updated
    session: Session = Depends(get_session)
):
    # Ensure team_id is explicitly mapped from prediction_data
    new_prediction = MatchPrediction(
        user_id=prediction_data.user_id,
        match_id=match_id, # From URL path
        team_id=prediction_data.team_id, # CRITICAL: Must match the schema
        formation=prediction_data.formation,
        mentality=prediction_data.mentality,
        pressing_intensity=prediction_data.pressing_intensity,
        players_csv="|".join(prediction_data.players),
        created_at=datetime.utcnow()
    )
    
    session.add(new_prediction)
    session.commit() # This is where the crash happened
    session.refresh(new_prediction)
    
    return {"message": "Tactical orders locked in!", "id": new_prediction.id}   

@router.get("/{match_id}/leaderboard", response_model=List[PredictionScore])
def get_leaderboard(match_id: int, session: Session = Depends(get_session)):
    """
    Ranks users by their total 'Football IQ' points.
    """
    # Logic to fetch all predictions and apply scoring
    statement = select(MatchPrediction).where(MatchPrediction.match_id == match_id)
    results = session.exec(statement).all()
    
    # Sorting and mapping logic would go here
    return []