"""
FORGE — Engineering Corps Manager

Orchestrates all engineering agents under the Engineering Corps.
Currently manages: RHODEY (War Machine — CI Guardian).

Future agents: BANNER (API health doctor), PETER (UI compliance),
               THOR (nightly data janitor).
"""
import logging
from typing import Any, Dict, List

from app.agents.rhodey import Rhodey

logger = logging.getLogger("fanxi.agents.forge")


class Forge:
    """Engineering Corps manager — runs and collects reports from engineering agents."""

    DEPARTMENT = "engineering"

    def __init__(self) -> None:
        self.rhodey = Rhodey()

    def run_all(self) -> Dict[str, Any]:
        """Execute all Engineering Corps agents and return a combined report."""
        results: Dict[str, Any] = {}

        # RHODEY — CI scan
        try:
            results["rhodey_ci"] = self.rhodey.run_ci_scan()
        except Exception as exc:
            logger.error("FORGE: RHODEY ci_scan failed: %s", exc)
            results["rhodey_ci"] = {"error": str(exc)}

        max_sev = max(
            r.get("severity", 0)
            for r in results.values()
            if isinstance(r, dict) and "severity" in r
        ) if results else 0

        logger.info(
            "FORGE_RUN_ALL agents=1 max_severity=%d", max_sev,
        )

        return {
            "department": self.DEPARTMENT,
            "agents_run": list(results.keys()),
            "max_severity": max_sev,
            "results": results,
        }

    def report(self, limit: int = 10) -> Dict[str, List[Dict[str, Any]]]:
        """Collect latest reports from all managed agents."""
        return {
            "rhodey": self.rhodey.report(limit=limit),
        }
