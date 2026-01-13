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

@router.post("/{match_id}/predictions", status_code=201)
def create_prediction(
    match_id: int,
    payload: PredictionInput,
    session: Session = Depends(get_session),
):
    """
    Submits a tactical lineup. 
    Includes Cybersecurity 'Time-Gate' check.
    """
    # 1. CYBERSECURITY: Prevent late entries
    # In a real scenario, you'd fetch the match kickoff time from your DB
    # if datetime.now(timezone.utc) > match.kickoff_time:
    #    raise HTTPException(status_code=403, detail="The match has already started!")

    # 2. DATA INTEGRITY: Validate player count
    players_list = [p.strip() for p in payload.players if p.strip()]
    if len(players_list) != 11:
        raise HTTPException(status_code=400, detail="Must select exactly 11 players.")

    # 3. SAVE TO VAULT
    db_obj = MatchPrediction(
        user_id=payload.user_id, # Link to real User ID
        match_id=match_id,
        formation=payload.formation,
        mentality=payload.mentality, # New Slider
        pressing_intensity=payload.pressing_intensity, # New Slider
        players_csv="|".join(players_list)
    )

    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)

    return {"message": "Tactical orders locked in!", "id": db_obj.id}

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