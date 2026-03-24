"""
STARK — Stark Design Labs Manager

Orchestrates all design agents under the Stark Design Labs division.
Currently manages: WANDA (Scarlet Witch — Typography + Accessibility Guardian).

Future agents: PEPPER (brand consistency), FRIDAY (responsive audit).
"""
import logging
from typing import Any, Dict, List

from app.agents.wanda import Wanda

logger = logging.getLogger("fanxi.agents.stark")


class Stark:
    """Stark Design Labs manager — runs and collects reports from design agents."""

    DEPARTMENT = "stark_design_labs"

    def __init__(self) -> None:
        self.wanda = Wanda()

    def run_all(self) -> Dict[str, Any]:
        """Execute all Stark Design Labs agents and return a combined report."""
        results: Dict[str, Any] = {}

        # WANDA — full design scan
        try:
            results["wanda_full_scan"] = self.wanda.run_full_scan()
        except Exception as exc:
            logger.error("STARK: WANDA full_scan failed: %s", exc)
            results["wanda_full_scan"] = {"error": str(exc)}

        max_sev = max(
            (
                r.get("severity", 0)
                for r in results.values()
                if isinstance(r, dict) and "severity" in r
            ),
            default=0,
        )

        logger.info(
            "STARK_RUN_ALL agents=1 max_severity=%d", max_sev,
        )

        return {
            "department": self.DEPARTMENT,
            "agents_run": list(results.keys()),
            "max_severity": max_sev,
            "results": results,
        }

    def morning_briefing(self) -> Dict[str, Any]:
        """
        Generate the Stark Design Labs morning briefing.

        Returns design health score, violation counts, and top issue.
        """
        violations = self.wanda.get_latest_violations()

        # Extract findings from latest run
        findings = violations.get("findings", [])

        # Flatten nested findings (full_scan stores summary objects)
        flat_findings: List[Dict[str, Any]] = []
        for f in findings:
            if "total_violations" in f:
                # This is a full_scan_summary — extract sub-lists
                flat_findings.extend(f.get("typography_violations", []))
                flat_findings.extend(f.get("accessibility_violations", []))
                flat_findings.extend(f.get("design_system_violations", []))
            else:
                flat_findings.append(f)

        design_health = self.wanda.calculate_design_health_score(flat_findings)

        critical = len([f for f in flat_findings if f.get("severity", 0) >= 70])
        warning = len([f for f in flat_findings if 40 <= f.get("severity", 0) < 70])

        # Find top issue
        top_issue = "No violations found"
        if flat_findings:
            worst = max(flat_findings, key=lambda f: f.get("severity", 0))
            top_issue = worst.get("message", "Unknown issue")

        # Count pending fixes in approval queue
        pending_fixes = 0
        try:
            from sqlmodel import Session, select, func
            from app.db import engine
            from app.models import ApprovalQueue

            with Session(engine) as session:
                pending_fixes = session.exec(
                    select(func.count(ApprovalQueue.id)).where(
                        ApprovalQueue.agent == "WANDA",
                        ApprovalQueue.status == "pending",
                    )
                ).one()
        except Exception as exc:
            logger.warning("STARK: Could not count pending fixes: %s", exc)

        return {
            "division": "stark_design_labs",
            "design_health_score": design_health,
            "total_violations": len(flat_findings),
            "critical_violations": critical,
            "warning_violations": warning,
            "top_issue": top_issue,
            "pending_fixes": pending_fixes,
        }

    def report(self, limit: int = 10) -> Dict[str, List[Dict[str, Any]]]:
        """Collect latest reports from all managed agents."""
        return {
            "wanda": self.wanda.report(limit=limit),
        }
