from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select

from app.schemas import Prediction, PredictionInput, PredictionScore, MatchSummary
from app.db import get_session
from app.models import PredictionDB

router = APIRouter(
    prefix="/matches",
    tags=["predictions"],
)

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


def to_prediction_model(row: PredictionDB) -> Prediction:
    """Convert DB row into API Prediction schema."""
    players = row.players_csv.split("|") if row.players_csv else []
    return Prediction(
        id=row.id,
        username=row.username,
        team_id=row.team_id,
        match_id=row.match_id,
        formation=row.formation,
        players=players,
        created_at=row.created_at,
    )


def score_single_prediction(
    prediction: Prediction,
    official_players: list[str],
) -> PredictionScore:
    """
    Compare a prediction's players to the official lineup and return a score object.
    Order does NOT matter; we just count how many names match (case-insensitive).
    """
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
def create_prediction(
    match_id: int,
    payload: PredictionInput,
    session: Session = Depends(get_session),
):
    """
    Let a fan submit a lineup prediction for a match.

    Security-ish rules:
    - Username is validated & normalized in PredictionInput
    - Exactly 11 players required
    - Only ONE prediction per (username, match_id): later ones overwrite the old one
    """
    # Ensure path and body match_id are consistent
    if payload.match_id != match_id:
        raise HTTPException(
            status_code=400,
            detail="match_id in path and body must match.",
        )

    if len(payload.players) != 11:
        raise HTTPException(
            status_code=400,
            detail="Prediction must contain exactly 11 players.",
        )

    players_csv = "|".join(payload.players)

    # Check if this user already has a prediction for this match
    existing = session.exec(
        select(PredictionDB).where(
            (PredictionDB.username == payload.username)
            & (PredictionDB.match_id == match_id)
        )
    ).first()

    if existing:
        # Update existing prediction
        existing.formation = payload.formation
        existing.players_csv = players_csv
        existing.created_at = datetime.utcnow()
        db_obj = existing
    else:
        # Create new prediction
        db_obj = PredictionDB(
            username=payload.username,
            team_id=payload.team_id,
            match_id=match_id,
            formation=payload.formation,
            players_csv=players_csv,
        )
        session.add(db_obj)

    session.commit()
    session.refresh(db_obj)

    return to_prediction_model(db_obj)


@router.get("/{match_id}/predictions", response_model=list[Prediction])
def list_predictions_for_match(
    match_id: int,
    session: Session = Depends(get_session),
):
    """
    List all predictions for a given match from the database.
    """
    result = session.exec(
        select(PredictionDB).where(PredictionDB.match_id == match_id)
    )
    rows = result.all()
    return [to_prediction_model(row) for row in rows]


@router.get("/{match_id}/scores", response_model=list[PredictionScore])
def list_scores_for_match(
    match_id: int,
    session: Session = Depends(get_session),
):
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

    result = session.exec(
        select(PredictionDB).where(PredictionDB.match_id == match_id)
    )
    rows = result.all()

    scores: list[PredictionScore] = []
    for row in rows:
        prediction = to_prediction_model(row)
        scores.append(score_single_prediction(prediction, official_players))

    scores.sort(key=lambda s: (-s.score, s.username.lower()))
    return scores


@router.get("/{match_id}/summary", response_model=MatchSummary)
def get_match_summary(
    match_id: int,
    session: Session = Depends(get_session),
):
    """
    Return a quick summary of prediction stats for a match:
    - how many predictions
    - how many unique users
    - best score
    - average score
    """
    if match_id not in OFFICIAL_LINEUPS:
        raise HTTPException(
            status_code=404,
            detail="No official lineup found for this match.",
        )

    official_players = OFFICIAL_LINEUPS[match_id]

    # grab all predictions for this match
    result = session.exec(
        select(PredictionDB).where(PredictionDB.match_id == match_id)
    )
    rows = result.all()

    if not rows:
        return MatchSummary(
            match_id=match_id,
            total_predictions=0,
            unique_users=0,
            best_score=0,
            average_score=0.0,
        )

    scores: list[PredictionScore] = []
    for row in rows:
        prediction = to_prediction_model(row)
        scores.append(score_single_prediction(prediction, official_players))

    total_predictions = len(scores)
    unique_users = len({s.username for s in scores})
    best_score = max(s.score for s in scores)
    average_score = sum(s.score for s in scores) / total_predictions

    return MatchSummary(
        match_id=match_id,
        total_predictions=total_predictions,
        unique_users=unique_users,
        best_score=best_score,
        average_score=average_score,
    )
