import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, List

from fastapi import APIRouter, HTTPException, Depends, Query, status
from sqlmodel import Session, select

from app.db import get_session
from app.models import MatchPrediction
from app.schemas import LockSelectionRequest

# Module-level logger — errors are written to the server log, never to HTTP
# responses, so internal details are never exposed to clients.
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/predictions",
    tags=["predictions"],
)

# ---------------------------------------------------------------------------
# Scoring helpers
#
# These are imported by web.py to score HTML-form predictions against the
# real post-match lineup.  They live here because predictions.py owns all
# scoring logic; web.py is purely a presentation layer.
# ---------------------------------------------------------------------------

# OFFICIAL_LINEUPS maps a match_id to the list of 11 player names that
# actually started the match.  Populated manually (or via an admin endpoint)
# once the real lineup is confirmed.  Empty dict = no scoring yet for any match.
# Example: { 1: ["L. Messi", "A. Di Maria", ...] }
OFFICIAL_LINEUPS: Dict[int, List[str]] = {}


@dataclass
class ScoreResult:
    """
    Result of scoring one prediction against the official lineup.
    - score           : percentage of correct players (0–100)
    - correct_players : number of names that matched
    - total_players   : size of the official lineup (denominator)
    """
    score: int
    correct_players: int
    total_players: int


def to_prediction_model(db_obj) -> dict:
    """
    Convert a PredictionDB row (HTML form submission) to a plain dict so
    score_single_prediction can work with it.

    PredictionDB stores players as a pipe-separated string to keep the DB
    schema simple for the HTML interface.  We split it back here.
    Example: "Messi|Ronaldo|Mbappe" -> ["Messi", "Ronaldo", "Mbappe"]
    """
    players = [p.strip() for p in db_obj.players_csv.split("|") if p.strip()]
    return {"players": players, "formation": db_obj.formation}


def score_single_prediction(prediction: dict, official_lineup: List[str]) -> ScoreResult:
    """
    Score a prediction against the official post-match lineup.

    Uses a set intersection so the comparison is order-independent and
    case-insensitive — "messi" and "Messi" both count as correct.

    Score formula: (correct / total) * 100, rounded down to an integer.
    """
    # Convert to lowercase sets for case-insensitive matching
    predicted = {p.lower() for p in prediction.get("players", [])}
    official = {p.lower() for p in official_lineup}

    correct = len(predicted & official)   # set intersection = exact matches
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
    # user_id is a query parameter for now (e.g. ?user_id=3).
    # TODO (Milestone 3): replace with `user_id = Depends(get_current_user)`
    # once JWT authentication is implemented.  The default of 1 keeps the
    # React frontend working during local development without auth.
    user_id: int = Query(default=1, description="Authenticated user ID (placeholder until JWT auth)"),
):
    """
    Save or overwrite a user's tactical lineup for a given match.

    If the user already has a prediction for this match it is updated
    (upsert behaviour) so they always have exactly one active prediction
    per match.  The lineup and tactics are stored as plain dicts (JSON)
    because the frontend sends a dynamic structure that varies by formation.
    """
    try:
        # Pydantic model instances are not JSON-serialisable by SQLite's JSON
        # column type, so we convert them to plain dicts first.
        clean_lineup = {
            pos: player.model_dump()
            for pos, player in prediction_data.lineup.items()
        }
        clean_tactics = prediction_data.tactics.model_dump()

        # Check for an existing prediction to update (upsert)
        existing = session.exec(
            select(MatchPrediction).where(
                MatchPrediction.match_id == match_id,
                MatchPrediction.user_id == user_id,
            )
        ).first()

        if existing:
            # Update in place — preserves the same row id for leaderboard
            # references and keeps the history table tidy.
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
        # Log the real error server-side for debugging, but return a generic
        # message to the client so internal DB details are never exposed.
        logger.error("DB error in lock_prediction (match=%s, user=%s): %s", match_id, user_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred. Please try again.",
        )


@router.get("/match/{match_id}")
def get_match_lineup(match_id: int, session: Session = Depends(get_session)):
    """
    Retrieve the locked lineup for a specific match.
    Returns the first prediction found for the match (pre-auth behaviour).
    """
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
    """
    Fetch all saved tactical snapshots for a scout, newest first.
    Used by the History tab in PitchBoard.tsx to re-hydrate past lineups.
    Returns an empty list (not 404) when the user has no predictions yet.
    """
    results = session.exec(
        select(MatchPrediction)
        .where(MatchPrediction.user_id == user_id)
        .order_by(MatchPrediction.created_at.desc())
    ).all()

    return results
