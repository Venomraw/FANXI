"""
SENTINEL — Shield Division Manager

Orchestrates all security agents under the Shield Division.
Currently manages: NATASHA (Black Widow).

Future agents: CLINT (Hawkeye — rate limit auditor).
"""
import logging
from typing import Any, Dict, List

from app.agents.natasha import Natasha

logger = logging.getLogger("fanxi.agents.sentinel")


class Sentinel:
    """Shield Division manager — runs and collects reports from security agents."""

    DEPARTMENT = "shield"

    def __init__(self) -> None:
        self.natasha = Natasha()

    def run_all(self) -> Dict[str, Any]:
        """Execute all Shield Division agents and return a combined report."""
        results: Dict[str, Any] = {}

        # NATASHA — secrets scan
        try:
            results["natasha_secrets"] = self.natasha.run_secrets_scan()
        except Exception as exc:
            logger.error("SENTINEL: NATASHA secrets_scan failed: %s", exc)
            results["natasha_secrets"] = {"error": str(exc)}

        # NATASHA — auth watchdog
        try:
            results["natasha_auth"] = self.natasha.run_auth_watchdog()
        except Exception as exc:
            logger.error("SENTINEL: NATASHA auth_watchdog failed: %s", exc)
            results["natasha_auth"] = {"error": str(exc)}

        max_sev = max(
            r.get("severity", 0)
            for r in results.values()
            if isinstance(r, dict) and "severity" in r
        ) if results else 0

        logger.info(
            "SENTINEL_RUN_ALL agents=1 max_severity=%d", max_sev,
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
            "natasha": self.natasha.report(limit=limit),
        }
