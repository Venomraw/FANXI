"""
FanXI Share Cards API

GET /cards/prediction/{match_id}  — auth required, returns user's prediction card PNG
GET /cards/profile/{username}     — public, returns scout profile card PNG
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlmodel import Session, select

from app.db import get_session
from app.models import MatchPrediction, User
from app.api.users import get_current_user
from app.api.matches import _ALL_FIXTURES
from app.services.card_generator import generate_prediction_card, generate_profile_card

router = APIRouter(prefix="/cards", tags=["cards"])


def _find_match(match_id: int) -> dict:
    """Look up a match from the static fixtures list by id."""
    for m in _ALL_FIXTURES:
        if m.get("id") == match_id:
            return m
    return {}


# ─────────────────────────────────────────────────────────────────────────────
# Prediction card
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/prediction/{match_id}")
def prediction_card(
    match_id: int,
    bust: bool = Query(default=False, description="Force regenerate (ignores cache)"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Response:
    """
    Generate and return a 1200×630 PNG share card for the authenticated
    user's locked prediction for the given match.

    The image is cached in /tmp/ for 10 minutes so repeated button clicks
    are instant. Pass ?bust=true to force regeneration after updating a
    prediction.
    """
    # Fetch user's prediction for this match
    prediction = session.exec(
        select(MatchPrediction).where(
            MatchPrediction.match_id == match_id,
            MatchPrediction.user_id == current_user.id,
        )
    ).first()

    if not prediction:
        raise HTTPException(
            status_code=404,
            detail="No locked prediction found for this match.",
        )

    match = _find_match(match_id)
    if not match:
        # Fallback match shell so card still renders
        match = {
            "id": match_id,
            "home_team": prediction.team_name or "Home",
            "away_team": "Away",
            "group": "WC 2026",
            "kickoff": "",
            "venue": "",
        }

    png_bytes = generate_prediction_card(
        user_id=current_user.id,
        match_id=match_id,
        prediction={
            "team_name":    prediction.team_name,
            "lineup_data":  prediction.lineup_data,
            "tactics_data": prediction.tactics_data,
            "match_result": prediction.match_result,
        },
        match=match,
        username=current_user.username,
        rank_title=current_user.rank_title,
        iq_points=current_user.football_iq_points,
        bust_cache=bust,
    )

    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={
            "Cache-Control": "public, max-age=300",
            "Content-Disposition": f'inline; filename="fanxi-{match_id}.png"',
        },
    )


# ─────────────────────────────────────────────────────────────────────────────
# Profile card
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/profile/{username}")
def profile_card(
    username: str,
    bust: bool = Query(default=False, description="Force regenerate (ignores cache)"),
    session: Session = Depends(get_session),
) -> Response:
    """
    Generate and return a 1200×630 PNG share card for a scout's public profile.
    No auth required — profile cards are public.
    """
    user = session.exec(
        select(User).where(User.username == username)
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Scout not found.")

    # Prediction count
    from sqlmodel import func
    prediction_count = session.exec(
        select(func.count(MatchPrediction.id)).where(MatchPrediction.user_id == user.id)
    ).one()

    profile = {
        "display_name":       user.display_name,
        "rank_title":         user.rank_title,
        "football_iq_points": user.football_iq_points,
        "prediction_count":   prediction_count,
        "favorite_nation":    user.favorite_nation,
        "country_allegiance": user.country_allegiance,
        "preferred_formation": user.preferred_formation,
        "tactical_style":     user.tactical_style,
    }

    png_bytes = generate_profile_card(
        username=user.username,
        profile=profile,
        bust_cache=bust,
    )

    return Response(
        content=png_bytes,
        media_type="image/png",
        headers={
            "Cache-Control": "public, max-age=3600",
            "Content-Disposition": f'inline; filename="fanxi-{username}.png"',
        },
    )
