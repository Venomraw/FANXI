from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, HTTPException, Depends, status
from sqlmodel import Session, select

from app.db import get_session
from app.models import MatchPrediction
from app.schemas import LockSelectionRequest

router = APIRouter(
    prefix="/predictions",
    tags=["predictions"],
)

@router.post("/lock/{match_id}", status_code=status.HTTP_201_CREATED)
async def lock_prediction(
    match_id: int,
    prediction_data: LockSelectionRequest,
    session: Session = Depends(get_session)
):
    try:
        # 1. Convert nested Pydantic objects to plain dictionaries
        # This solves the "Object of type PlayerInfo is not JSON serializable" error.
        clean_lineup = {
            pos: player.model_dump() 
            for pos, player in prediction_data.lineup.items()
        }
        clean_tactics = prediction_data.tactics.model_dump()

        existing = session.exec(
            select(MatchPrediction).where(
                MatchPrediction.match_id == match_id,
                MatchPrediction.user_id == 1 
            )
        ).first()

        if existing:
            existing.lineup_data = clean_lineup # Use clean dicts
            existing.tactics_data = clean_tactics
            existing.created_at = datetime.now(timezone.utc)
            new_prediction = existing
        else:
            new_prediction = MatchPrediction(
                user_id=1, 
                match_id=match_id,
                lineup_data=clean_lineup, # Use clean dicts
                tactics_data=clean_tactics,
                status="LOCKED",
                created_at=datetime.now(timezone.utc)
            )
            session.add(new_prediction)
        
        session.commit()
        session.refresh(new_prediction)
        
        return {
            "status": "success", 
            "message": "Tactical orders locked in!", 
            "prediction_id": new_prediction.id
        }
        
    except Exception as e:
        session.rollback()
        print(f"❌ DATABASE ERROR: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Serialization Error: {str(e)}"
        )

@router.get("/match/{match_id}")
def get_match_lineup(match_id: int, session: Session = Depends(get_session)):
    """
    Retrieves the user's locked lineup for a specific match.
    """
    statement = select(MatchPrediction).where(MatchPrediction.match_id == match_id)
    result = session.exec(statement).first()
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="No prediction found for this match."
        )
        
    return result

@router.get("/history/{user_id}", response_model=List[MatchPrediction])
def get_prediction_history(user_id: int, session: Session = Depends(get_session)):
    """
    Fetches all historical tactical locks for a specific scout.
    """
    statement = select(MatchPrediction).where(MatchPrediction.user_id == user_id).order_by(MatchPrediction.created_at.desc())
    results = session.exec(statement).all()
    
    if not results:
        return [] # Return empty list if no history exists
        
    return results