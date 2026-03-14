"""
WebSocket hub for live match updates.

Architecture:
- One APScheduler job per active match polls football-data.org every 60 s.
- All connected clients for that match_id receive JSON broadcast messages.
- On connect, client immediately receives the current match state so it
  doesn't have to wait up to 60 seconds for the first update.
- AI commentary job runs every 10 minutes per match.
- Max 200 WebSocket connections per match to prevent resource exhaustion.

Message types sent to clients:
  { "type": "state",        "data": { ...full match state... } }
  { "type": "score_update", "data": { ...score + minute... } }
  { "type": "goal",         "data": { scorer, team, minute, score } }
  { "type": "stats_update", "data": { momentum, minute } }
  { "type": "commentary",   "data": { minute, content } }
"""
from __future__ import annotations

import asyncio
import json
import logging
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, List, Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services import football_data as fd
from app.services import ai_commentary as ai_c

logger = logging.getLogger("fanxi.websocket")

router = APIRouter()
scheduler = AsyncIOScheduler(timezone="UTC")

# Dedicated thread pool for CPU-bound work (AI commentary, sync DB calls)
_executor = ThreadPoolExecutor(max_workers=16)

# match_id -> list of active WebSocket connections
_connections: Dict[int, List[WebSocket]] = {}

# match_id -> last known full state dict
_match_state: Dict[int, dict] = {}

# Max WebSocket connections per match
MAX_CONNECTIONS_PER_MATCH = 200


# ---------------------------------------------------------------------------
# Connection manager
# ---------------------------------------------------------------------------

async def _broadcast(match_id: int, message: dict) -> None:
    payload = json.dumps(message)
    dead: List[WebSocket] = []
    for ws in list(_connections.get(match_id, [])):
        try:
            await ws.send_text(payload)
        except Exception:
            dead.append(ws)
    for ws in dead:
        _disconnect(match_id, ws)


def _disconnect(match_id: int, ws: WebSocket) -> None:
    clients = _connections.get(match_id, [])
    try:
        clients.remove(ws)
    except ValueError:
        pass


# ---------------------------------------------------------------------------
# State builder (now async)
# ---------------------------------------------------------------------------

async def _build_full_state(match_id: int) -> Optional[dict]:
    raw = await fd.get_match(match_id)
    if not raw:
        return None

    score = raw.get("score", {})
    ft = score.get("fullTime", {})
    ht = score.get("halfTime", {})
    momentum = await fd.compute_momentum(match_id)

    return {
        "match_id": match_id,
        "status": raw.get("status"),
        "minute": raw.get("minute"),
        "home_team": raw.get("homeTeam", {}).get("name"),
        "away_team": raw.get("awayTeam", {}).get("name"),
        "home_flag": fd._flag(raw.get("homeTeam", {}).get("name", "")),
        "away_flag": fd._flag(raw.get("awayTeam", {}).get("name", "")),
        "home_goals": ft.get("home"),
        "away_goals": ft.get("away"),
        "ht_home": ht.get("home"),
        "ht_away": ht.get("away"),
        "venue": raw.get("venue"),
        "momentum": momentum,
    }


# ---------------------------------------------------------------------------
# Scheduler jobs
# ---------------------------------------------------------------------------

async def _poll_match(match_id: int) -> None:
    """Poll match state and broadcast diffs to connected clients."""
    state = await _build_full_state(match_id)
    if not state:
        return

    prev = _match_state.get(match_id, {})
    prev_home = prev.get("home_goals")
    prev_away = prev.get("away_goals")
    new_home = state.get("home_goals")
    new_away = state.get("away_goals")

    _match_state[match_id] = state

    if not _connections.get(match_id):
        return  # no clients -- skip broadcast

    if prev_home != new_home or prev_away != new_away:
        # Score changed -- find the latest goal event
        events = await fd.get_match_events(match_id)
        goals = [e for e in events if e["type"] == "goal"]
        last_goal = goals[-1] if goals else None

        await _broadcast(match_id, {
            "type": "goal",
            "data": {
                "scorer": last_goal.get("scorer") if last_goal else None,
                "team": last_goal.get("team") if last_goal else None,
                "minute": last_goal.get("minute") if last_goal else state.get("minute"),
                "home_goals": new_home,
                "away_goals": new_away,
            },
        })
        # Also send full state after goal
        await _broadcast(match_id, {"type": "state", "data": state})
    else:
        await _broadcast(match_id, {
            "type": "stats_update",
            "data": {
                "minute": state.get("minute"),
                "momentum": state.get("momentum"),
                "home_goals": new_home,
                "away_goals": new_away,
            },
        })


async def _commentary_job(match_id: int) -> None:
    """Generate AI commentary and broadcast to clients."""
    start = time.perf_counter()
    loop = asyncio.get_event_loop()
    text = await loop.run_in_executor(
        _executor, ai_c.generate_commentary, match_id
    )
    duration_ms = (time.perf_counter() - start) * 1000
    logger.info("AI_COMMENTARY match_id=%d duration_ms=%.0f success=%s", match_id, duration_ms, bool(text))
    if text and _connections.get(match_id):
        raw = await fd.get_match(match_id)
        minute = raw.get("minute") if raw else None
        await _broadcast(match_id, {
            "type": "commentary",
            "data": {"minute": minute, "content": text},
        })


def _ensure_jobs(match_id: int) -> None:
    """Start polling + commentary scheduler jobs for this match if not running."""
    poll_id = f"poll_{match_id}"
    commentary_id = f"commentary_{match_id}"

    if not scheduler.get_job(poll_id):
        scheduler.add_job(
            _poll_match,
            "interval",
            seconds=60,
            args=[match_id],
            id=poll_id,
            replace_existing=True,
        )

    if not scheduler.get_job(commentary_id):
        scheduler.add_job(
            _commentary_job,
            "interval",
            minutes=10,
            args=[match_id],
            id=commentary_id,
            replace_existing=True,
        )


def _maybe_remove_jobs(match_id: int) -> None:
    """Remove scheduler jobs when no clients remain for this match."""
    if _connections.get(match_id):
        return  # still have clients
    for job_id in [f"poll_{match_id}", f"commentary_{match_id}"]:
        job = scheduler.get_job(job_id)
        if job:
            scheduler.remove_job(job_id)


# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------

@router.websocket("/ws/match/{match_id}")
async def match_websocket(ws: WebSocket, match_id: int) -> None:
    # Reject if too many connections for this match
    current = _connections.get(match_id, [])
    if len(current) >= MAX_CONNECTIONS_PER_MATCH:
        logger.warning("WS_CAP_HIT match_id=%d connections=%d", match_id, len(current))
        await ws.close(code=1013, reason="Too many connections for this match")
        return

    await ws.accept()
    _connections.setdefault(match_id, []).append(ws)
    logger.info("WS_CONNECT match_id=%d connections=%d", match_id, len(_connections[match_id]))

    # Send current state immediately so client doesn't wait 60 s
    if match_id in _match_state:
        await ws.send_text(json.dumps({"type": "state", "data": _match_state[match_id]}))
    else:
        state = await _build_full_state(match_id)
        if state:
            _match_state[match_id] = state
            await ws.send_text(json.dumps({"type": "state", "data": state}))

    # Send last commentary entries
    loop = asyncio.get_event_loop()
    recent = await loop.run_in_executor(
        _executor, ai_c.get_recent_commentary, match_id, 3
    )
    for entry in recent:
        await ws.send_text(json.dumps({"type": "commentary", "data": entry}))

    _ensure_jobs(match_id)

    try:
        while True:
            # Keep connection alive; client can send "ping" text
            await ws.receive_text()
    except WebSocketDisconnect:
        _disconnect(match_id, ws)
        remaining = len(_connections.get(match_id, []))
        logger.info("WS_DISCONNECT match_id=%d connections=%d", match_id, remaining)
        _maybe_remove_jobs(match_id)
