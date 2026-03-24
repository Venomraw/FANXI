"""
In-app notification API — serves notifications written by PIETRO and
other agents to authenticated users.

Endpoints:
  GET  /notifications              — list notifications for current user
  POST /notifications/{id}/read    — mark single notification as read
  POST /notifications/read-all     — mark all notifications as read
  GET  /notifications/unread-count — unread count (polled by frontend)
"""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func

from app.db import get_session
from app.models import InAppNotification, User
from app.api.users import get_current_user

logger = logging.getLogger("fanxi.notifications")

router = APIRouter(prefix="/notifications", tags=["notifications"])


# ---------------------------------------------------------------------------
# List notifications
# ---------------------------------------------------------------------------

@router.get("")
def list_notifications(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    limit: int = 20,
):
    """
    Return unexpired notifications for the current user, newest first.
    Frontend polls this or fetches on dropdown open.
    """
    now = datetime.now(timezone.utc)
    notifications = session.exec(
        select(InAppNotification)
        .where(
            InAppNotification.user_id == current_user.id,
        )
        .order_by(InAppNotification.created_at.desc())
        .limit(limit)
    ).all()

    # Filter expired in Python (SQLite doesn't handle nullable datetime comparisons well)
    results = []
    for n in notifications:
        if n.expires_at and n.expires_at < now:
            continue
        results.append({
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "action_url": n.action_url,
            "notification_type": n.notification_type,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        })

    return results


# ---------------------------------------------------------------------------
# Mark as read
# ---------------------------------------------------------------------------

@router.post("/{notification_id}/read")
def mark_read(
    notification_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Mark a single notification as read."""
    notification = session.get(InAppNotification, notification_id)
    if not notification or notification.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    session.add(notification)
    session.commit()

    return {"success": True}


@router.post("/read-all")
def mark_all_read(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Mark all notifications as read for the current user."""
    notifications = session.exec(
        select(InAppNotification).where(
            InAppNotification.user_id == current_user.id,
            InAppNotification.is_read == False,  # noqa: E712
        )
    ).all()

    for n in notifications:
        n.is_read = True
        session.add(n)
    session.commit()

    return {"updated": len(notifications)}


# ---------------------------------------------------------------------------
# Unread count
# ---------------------------------------------------------------------------

@router.get("/unread-count")
def unread_count(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Return unread notification count.  Frontend polls this every 60s.
    Excludes expired notifications.
    """
    now = datetime.now(timezone.utc)

    # Get all unread for this user
    unread = session.exec(
        select(InAppNotification).where(
            InAppNotification.user_id == current_user.id,
            InAppNotification.is_read == False,  # noqa: E712
        )
    ).all()

    # Filter expired
    count = sum(1 for n in unread if not n.expires_at or n.expires_at >= now)

    return {"count": count}
