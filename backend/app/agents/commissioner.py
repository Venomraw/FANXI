"""
COMMISSIONER — Game Command Manager

Orchestrates all gameplay agents under the Game Command division.
Currently manages: PIETRO (Quicksilver — prediction nudger).

Future agents: STEVE (Captain America — admin audit trail),
               TONY (Iron Man — IQ economy / scoring rebalancer).
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from sqlmodel import Session, select, func

from app.agents.pietro import Pietro
from app.db import engine
from app.models import NudgeLog

logger = logging.getLogger("fanxi.agents.commissioner")


class Commissioner:
    """Game Command manager — runs and collects reports from gameplay agents."""

    DEPARTMENT = "game_command"

    def __init__(self) -> None:
        self.pietro = Pietro()

    def run_all(self) -> Dict[str, Any]:
        """Execute all Game Command agents and return a combined report."""
        results: Dict[str, Any] = {}

        # PIETRO — match nudge
        try:
            results["pietro_nudge"] = self.pietro.run_match_nudge()
        except Exception as exc:
            logger.error("COMMISSIONER: PIETRO match_nudge failed: %s", exc)
            results["pietro_nudge"] = {"error": str(exc)}

        # PIETRO — conversion check
        try:
            results["pietro_conversions"] = self.pietro.run_conversion_check()
        except Exception as exc:
            logger.error("COMMISSIONER: PIETRO conversion_check failed: %s", exc)
            results["pietro_conversions"] = {"error": str(exc)}

        max_sev = max(
            r.get("severity", 0)
            for r in results.values()
            if isinstance(r, dict) and "severity" in r
        ) if results else 0

        logger.info(
            "COMMISSIONER_RUN_ALL agents=1 max_severity=%d", max_sev,
        )

        return {
            "department": self.DEPARTMENT,
            "agents_run": list(results.keys()),
            "max_severity": max_sev,
            "results": results,
        }

    def morning_briefing(self) -> Dict[str, Any]:
        """Compile Game Command stats for the NEXUS morning briefing."""
        now = datetime.now(timezone.utc)
        last_24h = now - timedelta(hours=24)

        with Session(engine) as session:
            total_nudges = session.exec(
                select(func.count(NudgeLog.id))
            ).one()

            nudges_24h = session.exec(
                select(func.count(NudgeLog.id)).where(
                    NudgeLog.sent_at >= last_24h,
                )
            ).one()

            converted_24h = session.exec(
                select(func.count(NudgeLog.id)).where(
                    NudgeLog.sent_at >= last_24h,
                    NudgeLog.converted == True,  # noqa: E712
                )
            ).one()

            rate = round(converted_24h / nudges_24h * 100, 1) if nudges_24h else 0

        return {
            "department": self.DEPARTMENT,
            "total_nudges_all_time": total_nudges,
            "nudges_sent_last_24h": nudges_24h,
            "conversion_rate_last_24h": rate,
        }

    def report(self, limit: int = 10) -> Dict[str, List[Dict[str, Any]]]:
        """Collect latest reports from all managed agents."""
        return {
            "pietro": self.pietro.report(limit=limit),
        }
