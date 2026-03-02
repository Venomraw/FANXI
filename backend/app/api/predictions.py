import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, List

from fastapi import APIRouter, HTTPException, Depends, Query, status
from sqlmodel import Session, select

from app.db import get_session
from app.models import MatchPrediction
from app.schemas import LockSelectionRequest

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/predictions",
    tags=["predictions"],
)

# ---------------------------------------------------------------------------
# Scoring helpers — imported by web.py for the HTML prediction interface
# ---------------------------------------------------------------------------

# Populated manually once official lineups are known.
# Format: { match_id: ["Player One", "Player Two", ...] }
OFFICIAL_LINEUPS: Dict[int, List[str]] = {}


@dataclass
class ScoreResult:
    score: int
    correct_players: int
    total_players: int


def to_prediction_model(db_obj) -> dict:
    """Converts a PredictionDB row to a plain dict for scoring."""
    players = [p.strip() for p in db_obj.players_csv.split("|") if p.strip()]
    return {"players": players, "formation": db_obj.formation}


def score_single_prediction(prediction: dict, official_lineup: List[str]) -> ScoreResult:
    """Scores a prediction against the official lineup (case-insensitive name match)."""
    predicted = {p.lower() for p in prediction.get("players", [])}
    official = {p.lower() for p in official_lineup}
    correct = len(predicted & official)
    total = len(official)
    score = int((correct / total) * 100) if total > 0 else 0
    return ScoreResult(score=score, correct_players=correct, total_players=total)


# ---------------------------------------------------------------------------
# API endpoints
# ---------------------------------------------------------------------------

@router.post("/lock/{match_id}", status_code=status.HTTP_201_CREATED)
async def lock_prediction(
    match_id: int,
    prediction_data: LockSelectionRequest,
    session: Session = Depends(get_session),
    user_id: int = Query(default=1, description="Authenticated user ID (placeholder until JWT auth)"),
):
    try:
        clean_lineup = {
            pos: player.model_dump()
            for pos, player in prediction_data.lineup.items()
        }
        clean_tactics = prediction_data.tactics.model_dump()

        existing = session.exec(
            select(MatchPrediction).where(
                MatchPrediction.match_id == match_id,
                MatchPrediction.user_id == user_id,
            )
        ).first()

        if existing:
            existing.lineup_data = clean_lineup
            existing.tactics_data = clean_tactics
            existing.created_at = datetime.now(timezone.utc)
            new_prediction = existing
        else:
            new_prediction = MatchPrediction(
                user_id=user_id,
                match_id=match_id,
                lineup_data=clean_lineup,
                tactics_data=clean_tactics,
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
        logger.error("DB error in lock_prediction (match=%s, user=%s): %s", match_id, user_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again.",
        )


@router.get("/match/{match_id}")
def get_match_lineup(match_id: int, session: Session = Depends(get_session)):
    """Retrieves the locked lineup for a specific match."""
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
    """Fetches all historical tactical locks for a specific scout."""
    results = session.exec(
        select(MatchPrediction)
        .where(MatchPrediction.user_id == user_id)
        .order_by(MatchPrediction.created_at.desc())
    ).all()

    return results
