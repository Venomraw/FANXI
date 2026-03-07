"""
AI tactical commentary service.

Every 10 minutes during live matches, collects recent match events and
sends them to Groq/Llama 3.3 70B for a punchy tactical analysis.
Commentary is stored in the DB and broadcast via WebSocket.
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from groq import Groq
from sqlmodel import Session

from app.config import settings
from app.db import engine
from app.models import AiCommentary
from app.services import football_data as fd

SYSTEM_PROMPT = (
    "You are FanXI's tactical AI analyst covering the FIFA World Cup 2026. "
    "Generate punchy, intelligent tactical commentary (max 3 sentences) based on match events. "
    "Focus on formation implications, pressing patterns, and tactical shifts. "
    "Reference what FanXI scouts predicted pre-match when relevant. "
    "Never generic — always tactical. No filler phrases."
)


def _build_event_summary(match_id: int) -> str:
    """Summarise last 10 minutes of events as a short text for the AI prompt."""
    events = fd.get_match_events(match_id)
    stats = fd.get_match_stats(match_id)
    momentum = fd.compute_momentum(match_id)

    minute = stats.get("minute") or "?"
    score = stats.get("score", {})
    home = stats.get("home_team", "Home")
    away = stats.get("away_team", "Away")

    lines = [
        f"Match: {home} {score.get('home', 0)}-{score.get('away', 0)} {away}",
        f"Minute: {minute}",
        f"Momentum: {home} {momentum['home_pct']}% vs {away} {momentum['away_pct']}%",
        "",
        "Recent events:",
    ]

    # Show last 6 events
    for evt in events[-6:]:
        m = evt.get("minute", "?")
        if evt["type"] == "goal":
            lines.append(f"  {m}' GOAL — {evt.get('scorer')} ({evt.get('team')})")
        elif evt["type"] == "card":
            card = "🟨" if "YELLOW" in (evt.get("card_type") or "") else "🟥"
            lines.append(f"  {m}' {card} — {evt.get('player')} ({evt.get('team')})")
        elif evt["type"] == "sub":
            lines.append(f"  {m}' SUB — {evt.get('player_out')} ➔ {evt.get('player_in')} ({evt.get('team')})")

    return "\n".join(lines)


def generate_commentary(match_id: int) -> Optional[str]:
    """Call Groq to generate a tactical commentary snippet for the current match state."""
    if not settings.groq_api_key:
        return None

    try:
        event_summary = _build_event_summary(match_id)
        stats = fd.get_match_stats(match_id)
        minute = stats.get("minute") or 0

        client = Groq(api_key=settings.groq_api_key)
        result = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=200,
            temperature=0.75,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": event_summary},
            ],
        )
        text = result.choices[0].message.content or ""

        # Persist to DB
        with Session(engine) as session:
            entry = AiCommentary(
                match_id=match_id,
                minute=int(minute) if minute else None,
                content=text.strip(),
            )
            session.add(entry)
            session.commit()

        return text.strip()

    except Exception as exc:
        print(f"[ai_commentary] error for match {match_id}: {exc}")
        return None


def get_recent_commentary(match_id: int, limit: int = 5) -> List[dict]:
    """Fetch the last N commentary entries for a match from the DB."""
    from sqlmodel import select, desc
    with Session(engine) as session:
        rows = session.exec(
            select(AiCommentary)
            .where(AiCommentary.match_id == match_id)
            .order_by(desc(AiCommentary.created_at))
            .limit(limit)
        ).all()
    return [
        {
            "id": r.id,
            "minute": r.minute,
            "content": r.content,
            "created_at": r.created_at.isoformat(),
        }
        for r in reversed(rows)  # chronological order
    ]
