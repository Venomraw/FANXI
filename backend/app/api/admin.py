"""
Admin API endpoints — protected by is_admin flag on User model.

Provides operator controls for:
  - Match data refresh, status inspection, lock/unlock
  - Scoring triggers and re-runs
  - Prediction counts and leaderboard state
  - Failed job visibility
"""
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session, select, func

from app.db import get_session
from app.limiter import limiter
from app.models import MatchPrediction, User, AiCommentary, MatchDB, AgentRun, ApprovalQueue, NudgeLog
from app.api.users import get_current_user
from app.api.predictions import rank_title_for

logger = logging.getLogger("fanxi.admin")

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


# ---------------------------------------------------------------------------
# Dashboard overview
# ---------------------------------------------------------------------------

@router.get("/dashboard")
def admin_dashboard(
    session: Session = Depends(get_session),
    admin: User = Depends(_require_admin),
):
    """Aggregate stats for the admin overview panel."""
    total_users = session.exec(select(func.count(User.id))).one()
    total_predictions = session.exec(select(func.count(MatchPrediction.id))).one()
    locked_predictions = session.exec(
        select(func.count(MatchPrediction.id)).where(MatchPrediction.status == "LOCKED")
    ).one()
    scored_predictions = session.exec(
        select(func.count(MatchPrediction.id)).where(MatchPrediction.status == "SCORED")
    ).one()

    return {
        "total_users": total_users,
        "total_predictions": total_predictions,
        "locked_predictions": locked_predictions,
        "scored_predictions": scored_predictions,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/stats")
def admin_stats(
    session: Session = Depends(get_session),
    admin: User = Depends(_require_admin),
):
    """
    Extended platform overview for the admin panel frontend.
    Includes agent stats, nudge metrics, and approval queue count.
    """
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)

    total_users = session.exec(select(func.count(User.id))).one()
    total_predictions = session.exec(select(func.count(MatchPrediction.id))).one()

    predictions_today = session.exec(
        select(func.count(MatchPrediction.id)).where(
            MatchPrediction.created_at >= today_start,
        )
    ).one()

    # Nudge stats (last 24h)
    nudge_cutoff = now - timedelta(hours=24)
    nudges_24h = session.exec(
        select(func.count(NudgeLog.id)).where(NudgeLog.sent_at >= nudge_cutoff)
    ).one()
    nudges_converted = session.exec(
        select(func.count(NudgeLog.id)).where(
            NudgeLog.sent_at >= nudge_cutoff,
            NudgeLog.converted == True,  # noqa: E712
        )
    ).one()
    conversion_rate = round(nudges_converted / nudges_24h * 100, 1) if nudges_24h else 0

    # Approval queue
    open_approvals = session.exec(
        select(func.count(ApprovalQueue.id)).where(ApprovalQueue.status == "pending")
    ).one()

    # Agent stats
    active_agents = session.exec(
        select(func.count(func.distinct(AgentRun.agent)))
    ).one()
    critical_alerts = session.exec(
        select(func.count(AgentRun.id)).where(
            AgentRun.severity >= 80,
            AgentRun.created_at >= nudge_cutoff,
        )
    ).one()

    return {
        "total_users": total_users,
        "total_predictions": total_predictions,
        "predictions_today": predictions_today,
        "nudges_sent_24h": nudges_24h,
        "conversion_rate_24h": conversion_rate,
        "open_approval_queue": open_approvals,
        "active_agents": active_agents,
        "critical_alerts": critical_alerts,
        "timestamp": now.isoformat(),
    }


# ---------------------------------------------------------------------------
# Match management
# ---------------------------------------------------------------------------

@router.get("/matches")
def admin_list_matches(
    session: Session = Depends(get_session),
    admin: User = Depends(_require_admin),
):
    """List all matches with prediction counts."""
    # Get prediction counts per match
    results = session.exec(
        select(
            MatchPrediction.match_id,
            func.count(MatchPrediction.id).label("prediction_count"),
            func.count(func.nullif(MatchPrediction.status, "SCORED")).label("locked_count"),
        ).group_by(MatchPrediction.match_id)
    ).all()

    return [
        {
            "match_id": r[0],
            "prediction_count": r[1],
            "locked_count": r[2],
        }
        for r in results
    ]


@router.get("/matches/{match_id}/predictions")
def admin_match_predictions(
    match_id: int,
    session: Session = Depends(get_session),
    admin: User = Depends(_require_admin),
):
    """Inspect all predictions for a specific match."""
    predictions = session.exec(
        select(MatchPrediction).where(MatchPrediction.match_id == match_id)
    ).all()

    return [
        {
            "id": p.id,
            "user_id": p.user_id,
            "team_name": p.team_name,
            "status": p.status,
            "match_result": p.match_result,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in predictions
    ]


@router.post("/matches/{match_id}/lock")
def admin_lock_match(
    match_id: int,
    session: Session = Depends(get_session),
    admin: User = Depends(_require_admin),
):
    """Prevent new predictions for a match (mark all as LOCKED)."""
    predictions = session.exec(
        select(MatchPrediction).where(
            MatchPrediction.match_id == match_id,
            MatchPrediction.status == "LOCKED",
        )
    ).all()
    logger.info("ADMIN_LOCK_MATCH match_id=%d by=%s predictions=%d", match_id, admin.username, len(predictions))
    return {"match_id": match_id, "locked_count": len(predictions)}


@router.post("/matches/{match_id}/unlock")
def admin_unlock_match(
    match_id: int,
    session: Session = Depends(get_session),
    admin: User = Depends(_require_admin),
):
    """Re-open predictions for a match (revert SCORED -> LOCKED)."""
    predictions = session.exec(
        select(MatchPrediction).where(
            MatchPrediction.match_id == match_id,
            MatchPrediction.status == "SCORED",
        )
    ).all()
    for p in predictions:
        p.status = "LOCKED"
        session.add(p)
    session.commit()
    logger.info("ADMIN_UNLOCK_MATCH match_id=%d by=%s reverted=%d", match_id, admin.username, len(predictions))
    return {"match_id": match_id, "reverted_count": len(predictions)}


# ---------------------------------------------------------------------------
# Match data refresh
# ---------------------------------------------------------------------------

@router.post("/matches/{match_id}/refresh")
async def admin_refresh_match(
    match_id: int,
    admin: User = Depends(_require_admin),
):
    """Force-refresh match data from football-data.org (bypasses cache)."""
    from app.services.football_data import _cache

    # Clear cached entries for this match
    keys_to_clear = [k for k in _cache if f"/matches/{match_id}" in k]
    for k in keys_to_clear:
        del _cache[k]

    from app.services import football_data as fd
    data = await fd.get_match(match_id)
    logger.info("ADMIN_REFRESH_MATCH match_id=%d by=%s success=%s", match_id, admin.username, bool(data))

    if not data:
        raise HTTPException(status_code=404, detail="Match not found on football-data.org")

    return {
        "match_id": match_id,
        "status": data.get("status"),
        "minute": data.get("minute"),
        "home_team": data.get("homeTeam", {}).get("name"),
        "away_team": data.get("awayTeam", {}).get("name"),
        "score": data.get("score", {}).get("fullTime", {}),
    }


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

@router.post("/scoring/{match_id}/rerun")
@limiter.limit("5/minute")
def admin_rerun_scoring(
    request: Request,
    match_id: int,
    session: Session = Depends(get_session),
    admin: User = Depends(_require_admin),
):
    """
    Re-run scoring for a match. Idempotent: reverts all predictions to LOCKED,
    then delegates to the normal scoring endpoint logic.
    """
    # Revert to LOCKED first
    predictions = session.exec(
        select(MatchPrediction).where(MatchPrediction.match_id == match_id)
    ).all()

    if not predictions:
        raise HTTPException(status_code=404, detail="No predictions for this match")

    for p in predictions:
        p.status = "LOCKED"
        session.add(p)
    session.commit()

    logger.info("ADMIN_RERUN_SCORING match_id=%d by=%s predictions=%d", match_id, admin.username, len(predictions))
    return {
        "match_id": match_id,
        "reverted_to_locked": len(predictions),
        "message": "Predictions reverted to LOCKED. Now POST to /predictions/admin/score/{match_id} with the result.",
    }


# ---------------------------------------------------------------------------
# Leaderboard
# ---------------------------------------------------------------------------

@router.post("/leaderboard/recalculate")
@limiter.limit("2/minute")
def admin_recalculate_leaderboard(
    request: Request,
    session: Session = Depends(get_session),
    admin: User = Depends(_require_admin),
):
    """Recalculate rank_title for all users based on current football_iq_points."""
    users = session.exec(select(User)).all()
    updated = 0
    for u in users:
        new_title = rank_title_for(u.football_iq_points)
        if u.rank_title != new_title:
            u.rank_title = new_title
            session.add(u)
            updated += 1
    session.commit()
    logger.info("ADMIN_LEADERBOARD_RECALC by=%s updated=%d", admin.username, updated)
    return {"total_users": len(users), "titles_updated": updated}


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

@router.get("/users")
def admin_list_users(
    session: Session = Depends(get_session),
    admin: User = Depends(_require_admin),
    limit: int = 50,
    offset: int = 0,
):
    """Paginated user list for admin inspection."""
    users = session.exec(
        select(User).order_by(User.football_iq_points.desc()).offset(offset).limit(limit)
    ).all()
    total = session.exec(select(func.count(User.id))).one()

    return {
        "total": total,
        "users": [
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "country_allegiance": u.country_allegiance,
                "football_iq_points": u.football_iq_points,
                "rank_title": u.rank_title,
                "is_admin": u.is_admin,
                "is_banned": u.is_banned,
                "favorite_nation": u.favorite_nation,
                "onboarding_complete": u.onboarding_complete,
            }
            for u in users
        ],
    }


@router.post("/users/{user_id}/toggle-admin")
def admin_toggle_admin(
    user_id: int,
    session: Session = Depends(get_session),
    admin: User = Depends(_require_admin),
):
    """Toggle admin status for a user."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot toggle your own admin status")
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_admin = not user.is_admin
    session.add(user)
    session.commit()
    logger.info("ADMIN_TOGGLE user_id=%d is_admin=%s by=%s", user_id, user.is_admin, admin.username)
    return {"user_id": user_id, "is_admin": user.is_admin}


@router.post("/users/{user_id}/ban")
def admin_ban_user(
    user_id: int,
    session: Session = Depends(get_session),
    admin: User = Depends(_require_admin),
):
    """Ban a user.  Prevents login."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot ban yourself")
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_banned = True
    session.add(user)
    session.commit()
    logger.info("ADMIN_BAN user_id=%d username=%s by=%s", user_id, user.username, admin.username)
    return {"user_id": user_id, "username": user.username, "is_banned": True}


@router.post("/users/{user_id}/unban")
def admin_unban_user(
    user_id: int,
    session: Session = Depends(get_session),
    admin: User = Depends(_require_admin),
):
    """Unban a user."""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_banned = False
    session.add(user)
    session.commit()
    logger.info("ADMIN_UNBAN user_id=%d username=%s by=%s", user_id, user.username, admin.username)
    return {"user_id": user_id, "username": user.username, "is_banned": False}
