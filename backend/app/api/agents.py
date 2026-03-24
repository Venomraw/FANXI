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
  POST /agents/rhodey/run                   — manually trigger RHODEY
  POST /agents/vision/run                   — manually trigger VISION
  GET  /agents/vision/squad-audit           — latest squad audit results
  GET  /agents/vision/proposed-squads       — proposed squad gap report
  POST /agents/pietro/run                   — manually trigger PIETRO
  POST /agents/wanda/run                    — manually trigger WANDA
  GET  /agents/wanda/violations             — latest WANDA scan results
"""
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session, select, func

from app.db import get_session
from app.limiter import limiter
from app.models import AgentRun, ApprovalQueue, User, VisionCache
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


@router.post("/rhodey/run")
@limiter.limit("5/minute")
def trigger_rhodey(
    request: Request,
    admin: User = Depends(_require_admin),
    scan_only: bool = False,
):
    """
    Manually trigger RHODEY.  Query param scan_only=true for audit-only (no YAML gen).
    OpenClaw skill calls this on demand or as a scheduled cron.

    Returns the full result payload — flat JSON, ready for Telegram formatting.
    """
    from app.agents.rhodey import Rhodey
    rhodey = Rhodey()

    result = rhodey.run_ci_scan(scan_only=scan_only)

    logger.info(
        "RHODEY_MANUAL_TRIGGER by=%s scan_only=%s severity=%d",
        admin.username, scan_only, result.get("severity", 0),
    )

    return {
        "triggered_by": admin.username,
        "scan_only": scan_only,
        "severity": result.get("severity", 0),
        "result": result,
    }


@router.post("/vision/run")
@limiter.limit("5/minute")
def trigger_vision(
    request: Request,
    admin: User = Depends(_require_admin),
    run_type: Optional[str] = "all",
):
    """
    Manually trigger VISION.  Accepts run_type: 'squad_audit', 'scout_reports',
    'h2h_generation', 'formation_profiles', 'post_match_review', or 'all'.
    For post_match_review, optionally pass match_id query param.

    Returns the full result payload — flat JSON, ready for Telegram formatting.
    """
    from app.agents.vision import Vision
    vision = Vision()

    _valid = {
        "squad_audit", "scout_reports", "h2h_generation",
        "formation_profiles", "post_match_review", "all",
    }

    results = {}

    if run_type in ("squad_audit", "all"):
        results["squad_audit"] = vision.run_squad_audit()
    if run_type in ("scout_reports", "all"):
        results["scout_reports"] = vision.run_scout_reports()
    if run_type in ("h2h_generation", "all"):
        results["h2h_generation"] = vision.run_h2h_generation()
    if run_type in ("formation_profiles", "all"):
        results["formation_profiles"] = vision.run_formation_profiles()
    if run_type in ("post_match_review", "all"):
        results["post_match_review"] = vision.run_post_match_review()

    if not results:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid run_type: {run_type}. Use one of: {sorted(_valid)}",
        )

    max_severity = max(r.get("severity", 0) for r in results.values())

    logger.info(
        "VISION_MANUAL_TRIGGER by=%s run_type=%s max_severity=%d",
        admin.username, run_type, max_severity,
    )

    return {
        "triggered_by": admin.username,
        "run_type": run_type,
        "max_severity": max_severity,
        "results": results,
    }


@router.get("/vision/squad-audit")
def get_vision_squad_audit(
    admin: User = Depends(_require_admin),
):
    """
    Return the latest squad audit results.
    OpenClaw skill calls this to check squad health without triggering a new run.
    """
    from app.agents.vision import Vision
    vision = Vision()

    audit = vision.get_latest_squad_audit()
    if not audit:
        raise HTTPException(status_code=404, detail="No squad audit runs found. Trigger one first.")

    return audit


@router.get("/vision/proposed-squads")
def get_vision_proposed_squads(
    admin: User = Depends(_require_admin),
):
    """
    Return the contents of static_squads.proposed.json.
    OpenClaw skill calls this so the founder can review gap analysis in Telegram.
    """
    from app.agents.vision import Vision
    vision = Vision()

    proposed = vision.get_proposed_squads()
    if not proposed:
        raise HTTPException(
            status_code=404,
            detail="No proposed squads file found. Run a squad audit first.",
        )

    return proposed


@router.get("/vision/formation-profile/{team}")
def get_formation_profile(
    team: str,
    session: Session = Depends(get_session),
    admin: User = Depends(_require_admin),
):
    """
    Return the formation profile for a team.
    Stored only — does NOT trigger Groq generation.
    """
    now = datetime.now(timezone.utc)
    entry = session.exec(
        select(VisionCache).where(
            VisionCache.cache_type == "formation",
            VisionCache.lookup_key == team,
        )
        .order_by(VisionCache.generated_at.desc())
    ).first()

    if entry and entry.expires_at and entry.expires_at < now:
        entry = None

    if not entry:
        raise HTTPException(
            status_code=404,
            detail=f"No formation profile for '{team}'. Run VISION formation_profiles first.",
        )

    return {
        "team": entry.team,
        "profile": entry.report_data,
        "generated_at": entry.generated_at.isoformat() if entry.generated_at else None,
    }


@router.get("/vision/formation-profiles")
def get_all_formation_profiles(
    session: Session = Depends(get_session),
    admin: User = Depends(_require_admin),
):
    """
    Return all cached formation profiles.
    Only returns what exists — does NOT generate missing profiles.
    """
    now = datetime.now(timezone.utc)
    entries = session.exec(
        select(VisionCache).where(
            VisionCache.cache_type == "formation",
        )
        .order_by(VisionCache.team)
    ).all()

    profiles = []
    for e in entries:
        if e.expires_at and e.expires_at < now:
            continue
        profiles.append({
            "team": e.team,
            "primary_formation": e.report_data.get("primary_formation"),
            "primary_probability": e.report_data.get("primary_probability"),
            "tactical_style": e.report_data.get("tactical_style"),
            "manager": e.report_data.get("manager"),
            "generated_at": e.generated_at.isoformat() if e.generated_at else None,
        })

    return {
        "count": len(profiles),
        "profiles": profiles,
    }


# ---------------------------------------------------------------------------
# PIETRO — Quicksilver (Game Command)
# ---------------------------------------------------------------------------

@router.post("/pietro/run")
@limiter.limit("10/minute")
def trigger_pietro(
    request: Request,
    admin: User = Depends(_require_admin),
    run_type: Optional[str] = "match_nudge",
    match_id: Optional[int] = None,
):
    """
    Manually trigger PIETRO.  Accepts run_type: 'match_nudge', 'conversion_check', or 'all'.
    For match_nudge, optionally pass match_id to nudge for a specific match.
    OpenClaw skill calls this on demand or as a scheduled cron.
    """
    from app.agents.pietro import Pietro
    pietro = Pietro()

    results = {}

    if run_type in ("match_nudge", "all"):
        results["match_nudge"] = pietro.run_match_nudge(match_id=match_id)
    if run_type in ("conversion_check", "all"):
        results["conversion_check"] = pietro.run_conversion_check()

    if not results:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid run_type: {run_type}. Use 'match_nudge', 'conversion_check', or 'all'.",
        )

    logger.info(
        "PIETRO_MANUAL_TRIGGER by=%s run_type=%s match_id=%s",
        admin.username, run_type, match_id,
    )

    return {
        "triggered_by": admin.username,
        "run_type": run_type,
        "match_id": match_id,
        "results": results,
    }


# ---------------------------------------------------------------------------
# WANDA — Scarlet Witch (Stark Design Labs)
# ---------------------------------------------------------------------------

@router.post("/wanda/run")
@limiter.limit("5/minute")
def trigger_wanda(
    request: Request,
    admin: User = Depends(_require_admin),
    run_type: Optional[str] = "all",
):
    """
    Manually trigger WANDA.  Accepts run_type: 'typography', 'accessibility',
    'design_system', 'competitor_research', or 'all'.
    """
    from app.agents.wanda import Wanda
    wanda = Wanda()

    _valid = {
        "typography", "accessibility", "design_system",
        "competitor_research", "all",
    }

    results = {}

    if run_type in ("typography", "all"):
        results["typography"] = wanda.run_typography_scan()
    if run_type in ("accessibility", "all"):
        results["accessibility"] = wanda.run_accessibility_scan()
    if run_type in ("design_system", "all"):
        results["design_system"] = wanda.run_design_system_scan()
    if run_type in ("competitor_research",):
        results["competitor_research"] = wanda.run_competitor_research()

    # "all" does full scan with Groq suggestions instead of individual scans
    if run_type == "all":
        results = {"full_scan": wanda.run_full_scan()}

    if not results:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid run_type: {run_type}. Use one of: {sorted(_valid)}",
        )

    max_severity = max(r.get("severity", 0) for r in results.values())

    logger.info(
        "WANDA_MANUAL_TRIGGER by=%s run_type=%s max_severity=%d",
        admin.username, run_type, max_severity,
    )

    return {
        "triggered_by": admin.username,
        "run_type": run_type,
        "max_severity": max_severity,
        "results": results,
    }


@router.get("/wanda/violations")
def get_wanda_violations(
    admin: User = Depends(_require_admin),
):
    """
    Return latest WANDA scan results grouped by violation type + severity.
    """
    from app.agents.wanda import Wanda
    wanda = Wanda()

    violations = wanda.get_latest_violations()
    if "message" in violations and violations["message"] == "No WANDA runs found":
        raise HTTPException(
            status_code=404,
            detail="No WANDA runs found. Trigger one first.",
        )

    return violations
