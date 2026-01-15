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
    """
    ⚓ The Port of Call for your Next.js 'Lock Selection' button.
    Saves the full tactical snapshot (Lineup + Sliders) to the database.
    """
    try:
        # 🛡️ SECURITY: Check if a prediction already exists for this user/match
        # (Using user_id=1 as a placeholder until Auth is implemented)
        existing = session.exec(
            select(MatchPrediction).where(
                MatchPrediction.match_id == match_id,
                MatchPrediction.user_id == 1 
            )
        ).first()

        if existing:
            # Update the existing record instead of creating a duplicate
            existing.lineup_data = prediction_data.lineup
            existing.tactics_data = prediction_data.tactics.model_dump() # Updated from .dict()
            existing.created_at = datetime.now(timezone.utc)
            new_prediction = existing
        else:
            # Create a fresh tactical record
            new_prediction = MatchPrediction(
                user_id=1, 
                match_id=match_id,
                lineup_data=prediction_data.lineup,
                tactics_data=prediction_data.tactics.model_dump(),
                status="LOCKED",
                created_at=datetime.now(timezone.utc)
            )
            session.add(new_prediction)
        
        session.commit()
        session.refresh(new_prediction)
        
        return {
            "status": "success", 
            "message": "Tactical orders locked in!", 
            "prediction_id": new_prediction.id,
            "timestamp": new_prediction.created_at
        }
        
    except Exception as e:
        session.rollback() # Protect database integrity
        print(f"❌ DATABASE ERROR: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Failed to save tactical orders."
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