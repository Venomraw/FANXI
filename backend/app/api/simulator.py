"""
Bracket Simulator API — anonymous public endpoints.

Endpoints:
  POST /simulator/submit     — submit bracket (no auth)
  GET  /simulator/community  — aggregated community stats (cached 5min)
  POST /simulator/share      — save full bracket, return share_id
  GET  /simulator/share/{id} — retrieve shared bracket
"""
import logging
import secrets
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, field_validator
from sqlmodel import Session, select, func

from app.db import get_session
from app.limiter import limiter

logger = logging.getLogger("fanxi.simulator")

router = APIRouter(prefix="/simulator", tags=["simulator"])

# ---------------------------------------------------------------------------
# Allowed teams (48 WC2026 nations)
# ---------------------------------------------------------------------------
ALLOWED_TEAMS = {
    "Argentina", "Australia", "Belgium", "Bolivia", "Brazil",
    "Cameroon", "Canada", "Chile", "Colombia", "Costa Rica",
    "Croatia", "DR Congo", "Ecuador", "Egypt", "England",
    "France", "Germany", "Ghana", "Honduras", "Indonesia",
    "Iran", "Iraq", "Italy", "Japan", "Mexico",
    "Morocco", "Netherlands", "New Zealand", "Nigeria", "Panama",
    "Paraguay", "Peru", "Poland", "Portugal", "Qatar",
    "Romania", "Saudi Arabia", "Senegal", "Serbia", "South Africa",
    "South Korea", "Spain", "Switzerland", "Tunisia", "Turkey",
    "Ukraine", "Uruguay", "USA", "Venezuela",
}

# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class SubmitBracketRequest(BaseModel):
    session_id: str
    champion: str
    finalist: str
    semi_finalists: List[str]

    @field_validator("champion", "finalist")
    @classmethod
    def validate_team(cls, v: str) -> str:
        if v not in ALLOWED_TEAMS:
            raise ValueError(f"'{v}' is not a valid WC2026 team")
        return v

    @field_validator("semi_finalists")
    @classmethod
    def validate_semis(cls, v: List[str]) -> List[str]:
        if len(v) != 2:
            raise ValueError("semi_finalists must contain exactly 2 teams")
        for t in v:
            if t not in ALLOWED_TEAMS:
                raise ValueError(f"'{t}' is not a valid WC2026 team")
        return v

# ---------------------------------------------------------------------------
# Community stats cache (in-memory, 5 min TTL)
# ---------------------------------------------------------------------------
_community_cache: Dict[str, Any] = {}
_community_cache_ts: float = 0.0
_CACHE_TTL = 300  # 5 minutes

# ---------------------------------------------------------------------------
# POST /simulator/submit
# ---------------------------------------------------------------------------

@router.post("/submit")
@limiter.limit("20/minute")
def submit_bracket(
    request: Request,
    body: SubmitBracketRequest,
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """Submit an anonymous bracket. Upserts by session_id."""
    from app.models import SimulatorSubmission

    existing = session.exec(
        select(SimulatorSubmission).where(
            SimulatorSubmission.session_id == body.session_id
        )
    ).first()

    if existing:
        existing.champion = body.champion
        existing.finalist = body.finalist
        existing.semi_finalists = body.semi_finalists
        existing.submitted_at = datetime.utcnow()
        session.add(existing)
    else:
        sub = SimulatorSubmission(
            session_id=body.session_id,
            champion=body.champion,
            finalist=body.finalist,
            semi_finalists=body.semi_finalists,
        )
        session.add(sub)

    session.commit()

    # Bust cache
    global _community_cache_ts
    _community_cache_ts = 0.0

    return {"ok": True}

# ---------------------------------------------------------------------------
# GET /simulator/community
# ---------------------------------------------------------------------------

@router.get("/community")
@limiter.limit("30/minute")
def community_stats(
    request: Request,
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """Aggregated community bracket stats, cached 5 minutes."""
    global _community_cache, _community_cache_ts

    if time.time() - _community_cache_ts < _CACHE_TTL and _community_cache:
        return _community_cache

    from app.models import SimulatorSubmission

    total = session.exec(
        select(func.count(SimulatorSubmission.id))
    ).one()

    if total == 0:
        result: Dict[str, Any] = {
            "total_submissions": 0,
            "champion_votes": {},
            "most_picked_champion": None,
            "most_picked_finalist": None,
        }
        _community_cache = result
        _community_cache_ts = time.time()
        return result

    rows = session.exec(
        select(SimulatorSubmission.champion, func.count(SimulatorSubmission.id))
        .group_by(SimulatorSubmission.champion)
        .order_by(func.count(SimulatorSubmission.id).desc())
    ).all()

    champion_votes = {row[0]: row[1] for row in rows}
    most_picked_champion = rows[0][0] if rows else None

    finalist_rows = session.exec(
        select(SimulatorSubmission.finalist, func.count(SimulatorSubmission.id))
        .group_by(SimulatorSubmission.finalist)
        .order_by(func.count(SimulatorSubmission.id).desc())
    ).all()

    most_picked_finalist = finalist_rows[0][0] if finalist_rows else None

    result = {
        "total_submissions": total,
        "champion_votes": champion_votes,
        "most_picked_champion": most_picked_champion,
        "most_picked_finalist": most_picked_finalist,
    }

    _community_cache = result
    _community_cache_ts = time.time()
    return result


# ---------------------------------------------------------------------------
# Shareable bracket links
# ---------------------------------------------------------------------------

class ShareBracketRequest(BaseModel):
    bracket_data: Dict[str, Any]
    champion: str
    finalist: str
    display_name: str = ""

    @field_validator("champion", "finalist")
    @classmethod
    def validate_team(cls, v: str) -> str:
        if v not in ALLOWED_TEAMS:
            raise ValueError(f"'{v}' is not a valid WC2026 team")
        return v


@router.post("/share")
@limiter.limit("10/minute")
def share_bracket(
    request: Request,
    body: ShareBracketRequest,
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """Save a full bracket and return a shareable link."""
    from app.models import SharedBracket

    share_id = secrets.token_urlsafe(8)

    shared = SharedBracket(
        share_id=share_id,
        display_name=body.display_name[:50] if body.display_name else "",
        champion=body.champion,
        finalist=body.finalist,
        bracket_data=body.bracket_data,
    )
    session.add(shared)
    session.commit()

    return {"share_id": share_id}


@router.get("/share/{share_id}")
@limiter.limit("60/minute")
def get_shared_bracket(
    request: Request,
    share_id: str,
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """Retrieve a shared bracket by its share_id."""
    from app.models import SharedBracket

    shared = session.exec(
        select(SharedBracket).where(SharedBracket.share_id == share_id)
    ).first()

    if not shared:
        raise HTTPException(status_code=404, detail="Bracket not found")

    return {
        "share_id": shared.share_id,
        "display_name": shared.display_name,
        "champion": shared.champion,
        "finalist": shared.finalist,
        "bracket_data": shared.bracket_data,
        "created_at": shared.created_at.isoformat(),
    }
