"""
ORACLE — Intelligence Bureau Manager

Orchestrates all intelligence agents under the Intelligence Bureau.
Currently manages: VISION (Squad Completion + Scout Reports),
                   HERMES (SEO Content + Nation Pages).

Future agents: JARVIS (live match AI commentator).
"""
import logging
from typing import Any, Dict, List

from app.agents.vision import Vision
from app.agents.hermes import Hermes

logger = logging.getLogger("fanxi.agents.oracle")


class Oracle:
    """Intelligence Bureau manager — runs and collects reports from intel agents."""

    DEPARTMENT = "intelligence"

    def __init__(self) -> None:
        self.vision = Vision()
        self.hermes = Hermes()

    def run_all(self) -> Dict[str, Any]:
        """Execute all Intelligence Bureau agents and return a combined report."""
        results: Dict[str, Any] = {}

        # VISION — squad audit
        try:
            results["vision_squads"] = self.vision.run_squad_audit()
        except Exception as exc:
            logger.error("ORACLE: VISION squad_audit failed: %s", exc)
            results["vision_squads"] = {"error": str(exc)}

        # VISION — scout reports
        try:
            results["vision_scouts"] = self.vision.run_scout_reports()
        except Exception as exc:
            logger.error("ORACLE: VISION scout_reports failed: %s", exc)
            results["vision_scouts"] = {"error": str(exc)}

        # VISION — H2H generation
        try:
            results["vision_h2h"] = self.vision.run_h2h_generation()
        except Exception as exc:
            logger.error("ORACLE: VISION h2h_generation failed: %s", exc)
            results["vision_h2h"] = {"error": str(exc)}

        # VISION — formation profiles
        try:
            results["vision_formations"] = self.vision.run_formation_profiles()
        except Exception as exc:
            logger.error("ORACLE: VISION formation_profiles failed: %s", exc)
            results["vision_formations"] = {"error": str(exc)}

        # VISION — post-match reviews
        try:
            results["vision_post_match"] = self.vision.run_post_match_review()
        except Exception as exc:
            logger.error("ORACLE: VISION post_match_review failed: %s", exc)
            results["vision_post_match"] = {"error": str(exc)}

        # HERMES — SEO health check
        try:
            results["hermes_seo_health"] = self.hermes.run_seo_health()
        except Exception as exc:
            logger.error("ORACLE: HERMES seo_health failed: %s", exc)
            results["hermes_seo_health"] = {"error": str(exc)}

        max_sev = max(
            r.get("severity", 0)
            for r in results.values()
            if isinstance(r, dict) and "severity" in r
        ) if results else 0

        logger.info(
            "ORACLE_RUN_ALL agents=2 max_severity=%d", max_sev,
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
            "vision": self.vision.report(limit=limit),
            "hermes": self.hermes.report(limit=limit),
        }
