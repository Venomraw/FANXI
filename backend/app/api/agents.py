"""
Agent System API — command surface for the Avengers Initiative.

All endpoints are admin-only (JWT + is_admin flag).
Designed for clean JSON consumption by OpenClaw skills and the Admin Panel.

Endpoints:
  GET  /agents/runs                         — all agent runs (paginated)
  GET  /agents/runs/{agent_name}            — runs for a specific agent
  GET  /agents/approval-queue               — pending approvals
  POST /agents/approval-queue/{id}/approve  — approve an action
  POST /agents/approval-queue/{id}/reject   — reject an action
  POST /agents/natasha/run                  — manually trigger NATASHA
"""
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session, select, func

from app.db import get_session
from app.limiter import limiter
from app.models import AgentRun, ApprovalQueue, User
from app.api.users import get_current_user

logger = logging.getLogger("fanxi.agents.api")

router = APIRouter(prefix="/agents", tags=["agents"])


# ---------------------------------------------------------------------------
# Auth guard — reuses the same pattern as admin.py
# ---------------------------------------------------------------------------

def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


# ---------------------------------------------------------------------------
# Agent Runs
# ---------------------------------------------------------------------------

@router.get("/runs")
def list_agent_runs(
    session: Session = Depends(get_session),
    admin: User = Depends(_require_admin),
    limit: int = 50,
    offset: int = 0,
    agent: Optional[str] = None,
    department: Optional[str] = None,
):
    """
    List all agent runs, newest first.  Filterable by agent name and department.
    OpenClaw morning briefing calls this to compile the daily report.
    """
    query = select(AgentRun).order_by(AgentRun.created_at.desc())

    if agent:
        query = query.where(AgentRun.agent == agent.upper())
    if department:
        query = query.where(AgentRun.department == department.lower())

    query = query.offset(offset).limit(limit)
    runs = session.exec(query).all()
    total = session.exec(
        select(func.count(AgentRun.id))
    ).one()

    return {
        "total": total,
        "runs": [
            {
                "id": r.id,
                "agent": r.agent,
                "department": r.department,
                "run_type": r.run_type,
                "severity": r.severity,
                "findings_count": len(r.findings) if r.findings else 0,
                "actions_taken": r.actions_taken,
                "escalated_to_queue": r.escalated_to_queue,
                "summary": r.summary,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in runs
        ],
    }


@router.get("/runs/{agent_name}")
def get_agent_runs(
    agent_name: str,
    session: Session = Depends(get_session),
    admin: User = Depends(_require_admin),
    limit: int = 20,
):
    """
    Get runs for a specific agent.  Returns full findings payload.
    OpenClaw skill calls this to build per-agent Telegram summaries.
    """
    runs = session.exec(
        select(AgentRun)
        .where(AgentRun.agent == agent_name.upper())
        .order_by(AgentRun.created_at.desc())
        .limit(limit)
    ).all()

    return {
        "agent": agent_name.upper(),
        "runs": [
            {
                "id": r.id,
                "run_type": r.run_type,
                "severity": r.severity,
                "findings": r.findings,
                "actions_taken": r.actions_taken,
                "escalated_to_queue": r.escalated_to_queue,
                "summary": r.summary,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in runs
        ],
    }


# ---------------------------------------------------------------------------
# Approval Queue
# ---------------------------------------------------------------------------

@router.get("/approval-queue")
def list_approval_queue(
    session: Session = Depends(get_session),
    admin: User = Depends(_require_admin),
    status_filter: Optional[str] = "pending",
):
    """
    List approval queue items.  Defaults to pending only.
    Pass status_filter=all to see everything.
    OpenClaw sends pending items as Telegram inline buttons.
    """
    query = select(ApprovalQueue).order_by(ApprovalQueue.created_at.desc())

    if status_filter and status_filter != "all":
        query = query.where(ApprovalQueue.status == status_filter)

    items = session.exec(query).all()

    return {
        "count": len(items),
        "items": [
            {
                "id": q.id,
                "agent": q.agent,
                "department": q.department,
                "action_type": q.action_type,
                "action_data": q.action_data,
                "severity": q.severity,
                "reason": q.reason,
                "status": q.status,
                "reviewed_by": q.reviewed_by,
                "reviewed_at": q.reviewed_at.isoformat() if q.reviewed_at else None,
                "created_at": q.created_at.isoformat() if q.created_at else None,
            }
            for q in items
        ],
    }


@router.post("/approval-queue/{item_id}/approve")
def approve_action(
    item_id: int,
    session: Session = Depends(get_session),
    admin: User = Depends(_require_admin),
):
    """
    Approve a pending action.  Sets status to 'approved' and records who approved.
    OpenClaw calls this when founder replies 'approve' in Telegram.
    """
    item = session.get(ApprovalQueue, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Approval item not found")
    if item.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Item already {item.status} — cannot approve",
        )

    item.status = "approved"
    item.reviewed_by = admin.username
    item.reviewed_at = datetime.now(timezone.utc)
    session.add(item)
    session.commit()

    logger.info(
        "APPROVAL approved id=%d agent=%s action=%s by=%s",
        item_id, item.agent, item.action_type, admin.username,
    )

    return {
        "id": item.id,
        "status": "approved",
        "reviewed_by": admin.username,
        "action_type": item.action_type,
        "action_data": item.action_data,
    }


@router.post("/approval-queue/{item_id}/reject")
def reject_action(
    item_id: int,
    session: Session = Depends(get_session),
    admin: User = Depends(_require_admin),
):
    """
    Reject a pending action.  Sets status to 'rejected'.
    OpenClaw calls this when founder replies 'reject' in Telegram.
    """
    item = session.get(ApprovalQueue, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Approval item not found")
    if item.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Item already {item.status} — cannot reject",
        )

    item.status = "rejected"
    item.reviewed_by = admin.username
    item.reviewed_at = datetime.now(timezone.utc)
    session.add(item)
    session.commit()

    logger.info(
        "APPROVAL rejected id=%d agent=%s action=%s by=%s",
        item_id, item.agent, item.action_type, admin.username,
    )

    return {
        "id": item.id,
        "status": "rejected",
        "reviewed_by": admin.username,
    }


# ---------------------------------------------------------------------------
# Manual triggers
# ---------------------------------------------------------------------------

@router.post("/natasha/run")
@limiter.limit("5/minute")
def trigger_natasha(
    request: Request,
    admin: User = Depends(_require_admin),
    run_type: Optional[str] = "all",
):
    """
    Manually trigger NATASHA.  Accepts run_type: 'secrets_scan', 'auth_watchdog', or 'all'.
    OpenClaw skill calls this on demand or as a scheduled cron.

    Returns the full result payload — flat JSON, ready for Telegram formatting.
    """
    from app.agents.natasha import Natasha
    natasha = Natasha()

    results = {}

    if run_type in ("secrets_scan", "all"):
        results["secrets_scan"] = natasha.run_secrets_scan()
    if run_type in ("auth_watchdog", "all"):
        results["auth_watchdog"] = natasha.run_auth_watchdog()

    if not results:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid run_type: {run_type}. Use 'secrets_scan', 'auth_watchdog', or 'all'.",
        )

    max_severity = max(r.get("severity", 0) for r in results.values())

    logger.info(
        "NATASHA_MANUAL_TRIGGER by=%s run_type=%s max_severity=%d",
        admin.username, run_type, max_severity,
    )

    return {
        "triggered_by": admin.username,
        "run_type": run_type,
        "max_severity": max_severity,
        "results": results,
    }
