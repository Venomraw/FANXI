"""
VISION — Squad Completion + Scout Reports — Intelligence Bureau

Audits WC 2026 squads for completeness and generates pre-match AI
scout reports via Groq.

Responsibilities:
  1. squad_audit     — audit static_squads.py against the 48 qualified
                       nations list, check player counts, schema, positions,
                       duplicates.  Writes gap report to proposed file.
  2. scout_reports   — generate pre-match tactical scout reports for
                       upcoming matches via Groq (Llama 3.3 70B).

Severity scale (0–100):
  0–39  INFO     — all squads healthy, minor nits
  40–79 WARNING  — some squads undersized or missing fields
  80–99 CRITICAL — teams completely missing from static data
"""
import json
import logging
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from sqlmodel import Session, select

from app.db import engine
from app.models import AgentRun, ApprovalQueue, ScoutReport

logger = logging.getLogger("fanxi.agents.vision")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
_BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
_PROJECT_ROOT = _BACKEND_ROOT.parent
_PROPOSED_FILE = _BACKEND_ROOT / "app" / "data" / "static_squads.proposed.json"

# Target squad size — FIFA expanded to 26 since WC 2022
_TARGET_SQUAD_SIZE = 26

# Valid positions in static_squads.py
_VALID_POSITIONS = {"GK", "RB", "CB", "LB", "CDM", "CM", "CAM", "RW", "LW", "ST"}

# Position -> category mapping for distribution checks
_POS_CATEGORY = {
    "GK": "GK",
    "RB": "DEF", "CB": "DEF", "LB": "DEF",
    "CDM": "MID", "CM": "MID", "CAM": "MID",
    "RW": "FWD", "LW": "FWD", "ST": "FWD",
}

# Ideal distribution for a 26-player squad
_IDEAL_DISTRIBUTION = {"GK": 3, "DEF": 9, "MID": 8, "FWD": 6}

# The 48 FIFA World Cup 2026 qualified nations
WC2026_TEAMS = {
    "Mexico", "USA", "Canada", "Uruguay",
    "Argentina", "Ecuador", "Chile", "Peru",
    "Panama", "Senegal", "Colombia", "Costa Rica",
    "Venezuela", "Morocco", "Portugal", "Honduras",
    "Spain", "South Korea", "Nigeria", "Australia",
    "France", "Saudi Arabia", "Japan", "Tunisia",
    "Germany", "New Zealand", "Qatar", "DR Congo",
    "Netherlands", "Cameroon", "Paraguay", "Romania",
    "Brazil", "Belgium", "Croatia", "Switzerland",
    "England", "Serbia", "Iran", "Egypt",
    "Italy", "South Africa", "Ghana", "Türkiye",
    "Indonesia", "Bolivia", "Iraq", "Ukraine",
}


class Vision:
    """Squad Completion + Scout Reports for the Intelligence Bureau."""

    AGENT = "VISION"
    DEPARTMENT = "intelligence"

    # ----- public interface -----

    def run_squad_audit(self) -> Dict[str, Any]:
        """Audit all 48 WC 2026 squads.  Returns the AgentRun-shaped result dict."""
        findings: List[Dict[str, Any]] = []
        actions: List[str] = []

        team_reports = self._audit_squads()
        findings.extend(team_reports)

        severity = self._max_severity(findings)

        # Write proposed gap report if any teams are incomplete/missing
        incomplete = [
            f for f in findings
            if f.get("status") in ("missing", "incomplete")
        ]
        if incomplete:
            wrote = self._write_proposed_gap_report(findings, severity)
            if wrote:
                actions.append("Wrote static_squads.proposed.json")
                actions.append("Added to approval_queue")

        result = self._build_result("squad_audit", severity, findings, actions)

        self._save_run(result)
        if severity >= 80:
            self._escalate(result)

        logger.info(
            "VISION_SQUAD_AUDIT severity=%d findings=%d actions=%d",
            severity, len(findings), len(actions),
        )
        return result

    def run_scout_reports(self) -> Dict[str, Any]:
        """Generate scout reports for upcoming matches.  Returns AgentRun-shaped dict."""
        findings: List[Dict[str, Any]] = []
        actions: List[str] = []

        generated = self._generate_scout_reports()
        findings.extend(generated)

        severity = 0  # scout reports are informational, never critical
        result = self._build_result("scout_reports", severity, findings, actions)

        self._save_run(result)

        logger.info(
            "VISION_SCOUT_REPORTS generated=%d",
            len([f for f in findings if f.get("check") == "scout_report_generated"]),
        )
        return result

    def report(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Return the latest N runs for VISION."""
        with Session(engine) as session:
            runs = session.exec(
                select(AgentRun)
                .where(AgentRun.agent == self.AGENT)
                .order_by(AgentRun.created_at.desc())
                .limit(limit)
            ).all()
            return [self._run_to_dict(r) for r in runs]

    def get_latest_squad_audit(self) -> Optional[Dict[str, Any]]:
        """Return the most recent squad_audit run findings."""
        with Session(engine) as session:
            run = session.exec(
                select(AgentRun)
                .where(AgentRun.agent == self.AGENT, AgentRun.run_type == "squad_audit")
                .order_by(AgentRun.created_at.desc())
                .limit(1)
            ).first()
            if run:
                return self._run_to_dict(run)
            return None

    def get_proposed_squads(self) -> Optional[Dict[str, Any]]:
        """Return the contents of static_squads.proposed.json if it exists."""
        if not _PROPOSED_FILE.exists():
            return None
        try:
            return json.loads(_PROPOSED_FILE.read_text())
        except (json.JSONDecodeError, OSError):
            return None

    # ----- squad audit internals -----

    def _audit_squads(self) -> List[Dict[str, Any]]:
        """Audit every expected WC 2026 team against static_squads.py."""
        findings = []

        try:
            from app.data.static_squads import STATIC_SQUADS
        except ImportError:
            findings.append({
                "check": "static_squads_import_error",
                "severity": 90,
                "status": "error",
                "message": "Could not import static_squads.py",
            })
            return findings

        # Check each expected team
        for team_name in sorted(WC2026_TEAMS):
            squad = STATIC_SQUADS.get(team_name)

            if squad is None:
                findings.append({
                    "check": "team_audit",
                    "team": team_name,
                    "status": "missing",
                    "player_count": 0,
                    "severity": 80,
                    "issues": ["Team not found in static_squads.py"],
                    "message": f"{team_name}: MISSING from static_squads.py",
                })
                continue

            issues = []
            player_count = len(squad)

            # Size check
            if player_count < 11:
                issues.append(f"Only {player_count} players (need 11 minimum)")
            elif player_count < 20:
                issues.append(f"Only {player_count} players (target {_TARGET_SQUAD_SIZE})")
            elif player_count < _TARGET_SQUAD_SIZE:
                issues.append(f"{player_count} players (target {_TARGET_SQUAD_SIZE}, need {_TARGET_SQUAD_SIZE - player_count} more)")

            # Schema validation
            for i, player in enumerate(squad):
                if not player.get("name"):
                    issues.append(f"Player #{i+1}: missing name")
                if "number" not in player:
                    issues.append(f"Player {player.get('name', f'#{i+1}')}: missing number")
                pos = player.get("position", "")
                if pos not in _VALID_POSITIONS:
                    issues.append(f"Player {player.get('name', f'#{i+1}')}: invalid position '{pos}'")

            # Duplicate name check
            names = [p.get("name", "") for p in squad]
            name_counts = Counter(names)
            for name, count in name_counts.items():
                if count > 1 and name:
                    issues.append(f"Duplicate player: {name} appears {count} times")

            # Position distribution check
            categories = Counter(
                _POS_CATEGORY.get(p.get("position", ""), "UNKNOWN")
                for p in squad
            )
            for cat, ideal in _IDEAL_DISTRIBUTION.items():
                actual = categories.get(cat, 0)
                diff = abs(actual - ideal)
                if diff > 3:
                    issues.append(
                        f"Position imbalance: {cat} has {actual} players "
                        f"(ideal ~{ideal}, off by {diff})"
                    )

            # Determine status and severity
            if player_count == 0:
                status = "missing"
                sev = 80
            elif player_count < 11:
                status = "incomplete"
                sev = 70
            elif player_count < 20:
                status = "incomplete"
                sev = 50
            elif player_count < _TARGET_SQUAD_SIZE:
                status = "incomplete"
                sev = 30
            elif issues:
                status = "issues"
                sev = max(20, 10 * len(issues))
                sev = min(sev, 40)
            else:
                status = "complete"
                sev = 0

            findings.append({
                "check": "team_audit",
                "team": team_name,
                "status": status,
                "player_count": player_count,
                "target": _TARGET_SQUAD_SIZE,
                "severity": sev,
                "issues": issues,
                "message": f"{team_name}: {player_count}/{_TARGET_SQUAD_SIZE} players, {status}",
            })

        # Check for extra teams in static_squads not in WC2026 list
        extra_teams = set(STATIC_SQUADS.keys()) - WC2026_TEAMS
        if extra_teams:
            findings.append({
                "check": "extra_teams",
                "severity": 0,
                "teams": sorted(extra_teams),
                "message": f"{len(extra_teams)} team(s) in static_squads.py not in WC2026 list: {sorted(extra_teams)}",
            })

        return findings

    # ----- proposed gap report writer -----

    def _write_proposed_gap_report(
        self, findings: List[Dict[str, Any]], severity: int,
    ) -> bool:
        """Write a gap report to static_squads.proposed.json."""
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

        missing_teams = [
            f["team"] for f in findings
            if f.get("status") == "missing"
        ]
        incomplete_teams = {
            f["team"]: {
                "current_count": f["player_count"],
                "target": _TARGET_SQUAD_SIZE,
                "players_needed": _TARGET_SQUAD_SIZE - f["player_count"],
                "issues": f.get("issues", []),
            }
            for f in findings
            if f.get("status") == "incomplete"
        }
        complete_count = len([
            f for f in findings
            if f.get("check") == "team_audit" and f.get("status") in ("complete", "issues")
        ])

        report = {
            "_instructions": (
                "Review the gap analysis below. "
                "For missing teams: add a full squad entry to static_squads.py. "
                "For incomplete teams: add players to reach the target count. "
                "VISION will detect completion on next run and mark this resolved."
            ),
            "generated_at": timestamp,
            "agent": self.AGENT,
            "severity": severity,
            "summary": {
                "teams_audited": len(WC2026_TEAMS),
                "teams_complete": complete_count,
                "teams_incomplete": len(incomplete_teams),
                "teams_missing": len(missing_teams),
                "target_squad_size": _TARGET_SQUAD_SIZE,
            },
            "missing_teams": missing_teams,
            "incomplete_teams": incomplete_teams,
        }

        try:
            _PROPOSED_FILE.parent.mkdir(parents=True, exist_ok=True)
            _PROPOSED_FILE.write_text(json.dumps(report, indent=2, ensure_ascii=False))
            logger.info("VISION wrote gap report to %s", _PROPOSED_FILE)
        except OSError as exc:
            logger.error("VISION failed to write gap report: %s", exc)
            return False

        # Write to approval queue
        with Session(engine) as session:
            record = ApprovalQueue(
                agent=self.AGENT,
                department=self.DEPARTMENT,
                action_type="propose_squad_completion",
                action_data={
                    "proposed_file": "backend/app/data/static_squads.proposed.json",
                    "teams_audited": len(WC2026_TEAMS),
                    "teams_complete": complete_count,
                    "teams_incomplete": len(incomplete_teams),
                    "teams_missing": len(missing_teams),
                    "missing_teams": missing_teams,
                },
                severity=severity,
                reason=(
                    f"VISION found {len(missing_teams)} missing and "
                    f"{len(incomplete_teams)} incomplete team(s). "
                    f"Gap report written to static_squads.proposed.json"
                ),
            )
            session.add(record)
            session.commit()

        return True

    # ----- scout report generation -----

    def _generate_scout_reports(self) -> List[Dict[str, Any]]:
        """Generate scout reports for upcoming matches that don't have one yet."""
        findings = []

        # Get upcoming matches from the static fixture list
        try:
            from app.api.matches import _ALL_FIXTURES, _parse_kickoff
        except ImportError:
            findings.append({
                "check": "scout_report_error",
                "severity": 0,
                "message": "Could not import match fixtures",
            })
            return findings

        now = datetime.now(timezone.utc)
        cutoff = now + timedelta(hours=48)

        # Find matches within the next 48 hours
        upcoming = []
        for fix in _ALL_FIXTURES:
            try:
                kickoff = _parse_kickoff(fix["kickoff"]).astimezone(timezone.utc)
                if now < kickoff <= cutoff:
                    upcoming.append(fix)
            except (ValueError, KeyError):
                continue

        if not upcoming:
            findings.append({
                "check": "no_upcoming_matches",
                "severity": 0,
                "message": "No matches within 48 hours — no scout reports needed",
            })
            return findings

        with Session(engine) as session:
            for match in upcoming:
                match_id = match["id"]
                home = match["home_team"]
                away = match["away_team"]

                # Check if we already have a valid report
                existing = session.exec(
                    select(ScoutReport).where(
                        ScoutReport.match_id == match_id,
                        ScoutReport.expires_at > now,
                    )
                ).first()

                if existing:
                    findings.append({
                        "check": "scout_report_cached",
                        "severity": 0,
                        "match_id": match_id,
                        "message": f"{home} vs {away}: scout report exists (cached)",
                    })
                    continue

                # Generate via Groq
                report_data = self._call_groq_scout(home, away)
                if report_data:
                    report = ScoutReport(
                        match_id=match_id,
                        home_team=home,
                        away_team=away,
                        report_data=report_data,
                        agent=self.AGENT,
                        generated_at=now,
                        expires_at=now + timedelta(hours=24),
                    )
                    session.add(report)
                    findings.append({
                        "check": "scout_report_generated",
                        "severity": 0,
                        "match_id": match_id,
                        "message": f"{home} vs {away}: scout report generated",
                    })
                else:
                    findings.append({
                        "check": "scout_report_failed",
                        "severity": 20,
                        "match_id": match_id,
                        "message": f"{home} vs {away}: Groq generation failed",
                    })

            session.commit()

        return findings

    def _call_groq_scout(self, home: str, away: str) -> Optional[Dict[str, Any]]:
        """Call Groq to generate a scout report.  Returns parsed JSON or None."""
        try:
            from groq import Groq
            from app.config import settings

            if not settings.groq_api_key:
                logger.warning("VISION: No GROQ_API_KEY set — skipping scout report")
                return None

            client = Groq(api_key=settings.groq_api_key)

            prompt = (
                f"You are FanXI's tactical scout. Generate a pre-match scout report "
                f"for {home} vs {away} in the FIFA World Cup 2026.\n\n"
                f"Include:\n"
                f"1. Expected formation for each team (1 line each)\n"
                f"2. Key player to watch for each team (1 line each)\n"
                f"3. Tactical battle to watch (2 lines)\n"
                f"4. FanXI prediction tip (1 line)\n"
                f"5. Upset potential: LOW/MEDIUM/HIGH + reason\n\n"
                f"Keep it under 150 words total.\n"
                f"Be specific and tactical, not generic.\n"
                f"Output ONLY valid JSON with these exact keys:\n"
                f'{{\n'
                f'  "home_formation": "4-3-3",\n'
                f'  "away_formation": "4-2-3-1",\n'
                f'  "home_key_player": "Name — reason",\n'
                f'  "away_key_player": "Name — reason",\n'
                f'  "tactical_battle": "description",\n'
                f'  "prediction_tip": "tip",\n'
                f'  "upset_potential": "LOW|MEDIUM|HIGH",\n'
                f'  "upset_reason": "reason"\n'
                f'}}'
            )

            result = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are a football tactical analyst. Return only valid JSON."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.7,
                max_tokens=500,
            )

            raw = result.choices[0].message.content.strip()
            # Strip markdown fences if present
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
            if raw.endswith("```"):
                raw = raw[:-3].strip()
            if raw.startswith("json"):
                raw = raw[4:].strip()

            return json.loads(raw)

        except json.JSONDecodeError as exc:
            logger.warning("VISION: Groq returned invalid JSON for %s vs %s: %s", home, away, exc)
            return None
        except Exception as exc:
            logger.warning("VISION: Groq call failed for %s vs %s: %s", home, away, exc)
            return None

    # ----- helpers (match NATASHA/RHODEY exactly) -----

    @staticmethod
    def _max_severity(findings: List[Dict[str, Any]]) -> int:
        if not findings:
            return 0
        return max(f.get("severity", 0) for f in findings)

    def _build_result(
        self,
        run_type: str,
        severity: int,
        findings: List[Dict[str, Any]],
        actions: List[str],
    ) -> Dict[str, Any]:
        escalated = severity >= 80
        if severity == 0:
            level = "ALL_CLEAR"
        elif severity < 40:
            level = "INFO"
        elif severity < 80:
            level = "WARNING"
        else:
            level = "CRITICAL"

        summary = (
            f"[{level}] {run_type}: {len(findings)} finding(s), "
            f"severity {severity}/100"
        )
        if actions:
            summary += f", {len(actions)} action(s)"

        return {
            "agent": self.AGENT,
            "department": self.DEPARTMENT,
            "run_type": run_type,
            "severity": severity,
            "findings": findings,
            "actions_taken": actions,
            "escalated_to_queue": escalated,
            "summary": summary,
        }

    def _save_run(self, result: Dict[str, Any]) -> None:
        with Session(engine) as session:
            run = AgentRun(
                agent=result["agent"],
                department=result["department"],
                run_type=result["run_type"],
                severity=result["severity"],
                findings=result["findings"],
                actions_taken=result["actions_taken"],
                escalated_to_queue=result["escalated_to_queue"],
                summary=result["summary"],
            )
            session.add(run)
            session.commit()

    def _escalate(self, result: Dict[str, Any]) -> None:
        """Write critical findings to the approval queue."""
        critical = [f for f in result["findings"] if f.get("severity", 0) >= 80]
        with Session(engine) as session:
            for finding in critical:
                record = ApprovalQueue(
                    agent=self.AGENT,
                    department=self.DEPARTMENT,
                    action_type="review_finding",
                    action_data=finding,
                    severity=finding.get("severity", 80),
                    reason=finding.get("message", "Critical finding requires review"),
                )
                session.add(record)
            session.commit()

    @staticmethod
    def _run_to_dict(run: AgentRun) -> Dict[str, Any]:
        return {
            "id": run.id,
            "agent": run.agent,
            "department": run.department,
            "run_type": run.run_type,
            "severity": run.severity,
            "findings": run.findings,
            "actions_taken": run.actions_taken,
            "escalated_to_queue": run.escalated_to_queue,
            "summary": run.summary,
            "created_at": run.created_at.isoformat() if run.created_at else None,
        }
