"""
VISION — Intelligence Bureau — Squad + Tactical Intelligence

Audits WC 2026 squads, generates pre-match AI scout reports, H2H
histories, formation profiles, and post-match community reviews.

Responsibilities:
  1. squad_audit        — audit static_squads.py against 48 qualified nations
  2. scout_reports      — pre-match tactical scout reports via Groq
  3. h2h_generation     — head-to-head history between fixture opponents
  4. formation_profiles — formation probability breakdown per team
  5. post_match_review  — community prediction accuracy analysis

Severity scale (0–100):
  0–39  INFO     — all squads healthy, minor nits
  40–79 WARNING  — some squads undersized or missing fields
  80–99 CRITICAL — teams completely missing from static data
"""
import json
import logging
import re
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from sqlmodel import Session, select

from app.db import engine
from app.models import AgentRun, ApprovalQueue, ScoutReport, VisionCache, MatchPrediction

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


# ---------------------------------------------------------------------------
# WC 2026 manager lookup — used by formation profile generator
# ---------------------------------------------------------------------------
WC2026_MANAGERS: Dict[str, str] = {
    "Argentina": "Lionel Scaloni",
    "Australia": "Tony Popovic",
    "Belgium": "Domenico Tedesco",
    "Bolivia": "Oscar Villegas",
    "Brazil": "Dorival Junior",
    "Cameroon": "Marc Brys",
    "Canada": "Jesse Marsch",
    "Chile": "Ricardo Gareca",
    "Colombia": "Nestor Lorenzo",
    "Costa Rica": "Claudio Vivas",
    "Croatia": "Zlatko Dalic",
    "DR Congo": "Sebastien Desabre",
    "Ecuador": "Sebastian Beccacece",
    "Egypt": "Hossam Hassan",
    "England": "Thomas Tuchel",
    "France": "Didier Deschamps",
    "Germany": "Julian Nagelsmann",
    "Ghana": "Otto Addo",
    "Honduras": "Reinaldo Rueda",
    "Indonesia": "Shin Tae-yong",
    "Iran": "Amir Ghalenoei",
    "Iraq": "Jesus Casas",
    "Italy": "Luciano Spalletti",
    "Japan": "Hajime Moriyasu",
    "Mexico": "Javier Aguirre",
    "Morocco": "Walid Regragui",
    "Netherlands": "Ronald Koeman",
    "New Zealand": "Darren Bazeley",
    "Nigeria": "Eric Chelle",
    "Panama": "Thomas Christiansen",
    "Paraguay": "Gustavo Alfaro",
    "Peru": "Jorge Fossati",
    "Portugal": "Roberto Martinez",
    "Qatar": "Martin Lasarte",
    "Romania": "Mircea Lucescu",
    "Saudi Arabia": "Roberto Mancini",
    "Senegal": "Aliou Cisse",
    "Serbia": "Dragan Stojkovic",
    "South Africa": "Hugo Broos",
    "South Korea": "Hong Myung-bo",
    "Spain": "Luis de la Fuente",
    "Switzerland": "Murat Yakin",
    "Tunisia": "Faouzi Benzarti",
    "Türkiye": "Vincenzo Montella",
    "USA": "Mauricio Pochettino",
    "Ukraine": "Serhiy Rebrov",
    "Uruguay": "Marcelo Bielsa",
    "Venezuela": "Fernando Batista",
}

# Valid tactical styles for formation profiles
_TACTICAL_STYLES = {
    "tiki-taka", "counter-attack", "high-press",
    "direct", "possession", "defensive-block",
}

# Formation pattern: d-d-d or d-d-d-d
_FORMATION_RE = re.compile(r"^\d-\d-\d(-\d)?$")


class Vision:
    """Intelligence Bureau agent — squad audit, scout reports, H2H, formations, post-match."""

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

    # ----- responsibility 3: head-to-head -----

    def run_h2h_generation(self) -> Dict[str, Any]:
        """Pre-generate H2H reports for upcoming matches."""
        findings: List[Dict[str, Any]] = []
        actions: List[str] = []

        upcoming = self._get_upcoming_fixtures(hours_ahead=72, limit=10)
        if not upcoming:
            findings.append({
                "check": "no_upcoming_matches",
                "severity": 0,
                "message": "No matches within 72 hours — no H2H needed",
            })
        else:
            with Session(engine) as session:
                for match in upcoming:
                    home, away = match["home_team"], match["away_team"]
                    lookup_key = self._h2h_key(home, away)
                    now = datetime.now(timezone.utc)

                    existing = session.exec(
                        select(VisionCache).where(
                            VisionCache.cache_type == "h2h",
                            VisionCache.lookup_key == lookup_key,
                            VisionCache.expires_at > now,
                        )
                    ).first()

                    if existing:
                        findings.append({
                            "check": "h2h_cached",
                            "severity": 0,
                            "message": f"{home} vs {away}: H2H exists (cached)",
                        })
                        continue

                    report_data = self._call_groq_h2h(home, away)
                    if report_data:
                        entry = VisionCache(
                            cache_type="h2h",
                            lookup_key=lookup_key,
                            match_id=match["id"],
                            home_team=home,
                            away_team=away,
                            report_data=report_data,
                            generated_at=now,
                            expires_at=now + timedelta(days=7),
                        )
                        session.add(entry)
                        findings.append({
                            "check": "h2h_generated",
                            "severity": 0,
                            "message": f"{home} vs {away}: H2H generated",
                        })
                    else:
                        findings.append({
                            "check": "h2h_failed",
                            "severity": 20,
                            "message": f"{home} vs {away}: Groq H2H generation failed",
                        })
                session.commit()

        severity = self._max_severity(findings)
        result = self._build_result("h2h_generation", severity, findings, actions)
        self._save_run(result)

        logger.info(
            "VISION_H2H_GENERATION generated=%d",
            len([f for f in findings if f.get("check") == "h2h_generated"]),
        )
        return result

    # ----- responsibility 4: formation profiles -----

    def run_formation_profiles(self) -> Dict[str, Any]:
        """Generate or refresh formation profiles for all 48 WC2026 teams."""
        findings: List[Dict[str, Any]] = []
        actions: List[str] = []
        now = datetime.now(timezone.utc)

        with Session(engine) as session:
            for team_name in sorted(WC2026_TEAMS):
                existing = session.exec(
                    select(VisionCache).where(
                        VisionCache.cache_type == "formation",
                        VisionCache.lookup_key == team_name,
                        VisionCache.expires_at > now,
                    )
                ).first()

                if existing:
                    findings.append({
                        "check": "formation_cached",
                        "severity": 0,
                        "team": team_name,
                        "message": f"{team_name}: formation profile exists (cached)",
                    })
                    continue

                manager = WC2026_MANAGERS.get(team_name, "Unknown")
                report_data = self._call_groq_formation(team_name, manager)
                if report_data:
                    entry = VisionCache(
                        cache_type="formation",
                        lookup_key=team_name,
                        team=team_name,
                        report_data=report_data,
                        generated_at=now,
                        expires_at=now + timedelta(days=30),
                    )
                    session.add(entry)
                    findings.append({
                        "check": "formation_generated",
                        "severity": 0,
                        "team": team_name,
                        "message": f"{team_name}: formation profile generated",
                    })
                else:
                    findings.append({
                        "check": "formation_failed",
                        "severity": 20,
                        "team": team_name,
                        "message": f"{team_name}: Groq formation generation failed",
                    })
            session.commit()

        severity = self._max_severity(findings)
        result = self._build_result("formation_profiles", severity, findings, actions)
        self._save_run(result)

        generated = len([f for f in findings if f.get("check") == "formation_generated"])
        logger.info("VISION_FORMATION_PROFILES generated=%d", generated)
        return result

    # ----- responsibility 5: post-match review -----

    def run_post_match_review(self, match_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Generate post-match community reviews for recently finished matches.
        If match_id is provided, review that specific match only.
        """
        findings: List[Dict[str, Any]] = []
        actions: List[str] = []

        if match_id:
            matches_to_review = self._get_finished_match(match_id)
        else:
            matches_to_review = self._get_recently_finished_matches()

        if not matches_to_review:
            findings.append({
                "check": "no_finished_matches",
                "severity": 0,
                "message": "No recently finished matches to review",
            })
        else:
            with Session(engine) as session:
                for match in matches_to_review:
                    mid = match["id"]
                    lookup = f"match:{mid}"

                    existing = session.exec(
                        select(VisionCache).where(
                            VisionCache.cache_type == "post_match",
                            VisionCache.lookup_key == lookup,
                        )
                    ).first()

                    if existing:
                        findings.append({
                            "check": "post_match_cached",
                            "severity": 0,
                            "match_id": mid,
                            "message": f"Match {mid}: review already exists",
                        })
                        continue

                    review = self._build_post_match_review(session, match)
                    if review:
                        entry = VisionCache(
                            cache_type="post_match",
                            lookup_key=lookup,
                            match_id=mid,
                            home_team=match.get("home_team", ""),
                            away_team=match.get("away_team", ""),
                            report_data=review,
                            generated_at=datetime.now(timezone.utc),
                            expires_at=None,  # post-match reviews never expire
                        )
                        session.add(entry)
                        findings.append({
                            "check": "post_match_generated",
                            "severity": 0,
                            "match_id": mid,
                            "message": f"Match {mid}: post-match review generated",
                        })
                    else:
                        findings.append({
                            "check": "post_match_no_predictions",
                            "severity": 0,
                            "match_id": mid,
                            "message": f"Match {mid}: no predictions found — skipped",
                        })
                session.commit()

        severity = self._max_severity(findings)
        result = self._build_result("post_match_review", severity, findings, actions)
        self._save_run(result)

        logger.info(
            "VISION_POST_MATCH_REVIEW generated=%d",
            len([f for f in findings if f.get("check") == "post_match_generated"]),
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

        upcoming = self._get_upcoming_fixtures(hours_ahead=48)
        if not upcoming:
            findings.append({
                "check": "no_upcoming_matches",
                "severity": 0,
                "message": "No matches within 48 hours — no scout reports needed",
            })
            return findings

        now = datetime.now(timezone.utc)
        with Session(engine) as session:
            for match in upcoming:
                match_id = match["id"]
                home = match["home_team"]
                away = match["away_team"]

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

    # ----- H2H internals -----

    @staticmethod
    def _h2h_key(team_a: str, team_b: str) -> str:
        """Canonical H2H key — alphabetical so A::B == B::A."""
        return "::".join(sorted([team_a, team_b]))

    def _call_groq_h2h(self, home: str, away: str) -> Optional[Dict[str, Any]]:
        """Call Groq to generate H2H history.  Returns parsed JSON or None."""
        prompt = (
            f"You are a football historian. Generate accurate head-to-head statistics "
            f"between {home} and {away} in international football.\n\n"
            f"Return ONLY valid JSON, no explanation:\n"
            f'{{\n'
            f'  "total_meetings": <int>,\n'
            f'  "home_wins": <int — {home} wins>,\n'
            f'  "away_wins": <int — {away} wins>,\n'
            f'  "draws": <int>,\n'
            f'  "home_goals_scored": <int — by {home}>,\n'
            f'  "away_goals_scored": <int — by {away}>,\n'
            f'  "last_meeting": {{\n'
            f'    "year": <int>,\n'
            f'    "competition": "<competition name>",\n'
            f'    "score": "<home_score>-<away_score>",\n'
            f'    "venue": "<city, country>"\n'
            f'  }},\n'
            f'  "biggest_home_win": "<score> (<year> <competition>)",\n'
            f'  "biggest_away_win": "<score> (<year> <competition>)",\n'
            f'  "wc_meetings": <int — World Cup meetings only>,\n'
            f'  "narrative": "<2-3 compelling sentences about the rivalry>"\n'
            f'}}\n\n'
            f"Be historically accurate. If these teams have rarely met, reflect that honestly."
        )
        data = self._call_groq(prompt)
        if not data:
            return None

        # Validate
        try:
            for field in ("total_meetings", "home_wins", "away_wins", "draws", "wc_meetings"):
                if not isinstance(data.get(field), int) or data[field] < 0:
                    data[field] = max(0, int(data.get(field, 0)))
            if not data.get("narrative"):
                data["narrative"] = "Historical data unavailable"
        except (TypeError, ValueError):
            data["narrative"] = "Historical data unavailable"

        return data

    # ----- formation profile internals -----

    def _call_groq_formation(self, team: str, manager: str) -> Optional[Dict[str, Any]]:
        """Call Groq to generate a formation profile.  Returns parsed JSON or None."""
        prompt = (
            f"You are a tactical football analyst covering the FIFA World Cup 2026.\n\n"
            f"Analyze {team}'s likely tactical setup for WC2026 under manager {manager}.\n\n"
            f"Return ONLY valid JSON:\n"
            f'{{\n'
            f'  "primary_formation": "4-3-3",\n'
            f'  "primary_probability": 0.65,\n'
            f'  "secondary_formation": "4-2-3-1",\n'
            f'  "secondary_probability": 0.25,\n'
            f'  "tertiary_formation": "3-5-2",\n'
            f'  "tertiary_probability": 0.10,\n'
            f'  "manager": "{manager}",\n'
            f'  "tactical_style": "<one of: tiki-taka, counter-attack, high-press, direct, possession, defensive-block>",\n'
            f'  "key_tactical_trait": "<1 sentence>",\n'
            f'  "pressing_intensity": <1-10>,\n'
            f'  "defensive_line": "<high|medium|low>",\n'
            f'  "build_up_style": "<short|mixed|direct>",\n'
            f'  "set_piece_threat": "<low|medium|high>",\n'
            f'  "wc2026_outlook": "<2-3 sentence tournament prediction>"\n'
            f'}}'
        )
        data = self._call_groq(prompt)
        if not data:
            return None

        # Validate formations
        for key in ("primary_formation", "secondary_formation", "tertiary_formation"):
            val = data.get(key, "")
            if not _FORMATION_RE.match(str(val)):
                logger.warning("VISION: Invalid formation '%s' for %s.%s", val, team, key)
                return None

        # Validate probabilities sum
        probs = [
            data.get("primary_probability", 0),
            data.get("secondary_probability", 0),
            data.get("tertiary_probability", 0),
        ]
        try:
            total = sum(float(p) for p in probs)
            if abs(total - 1.0) > 0.05:
                logger.warning("VISION: Formation probs sum to %.2f for %s (expected ~1.0)", total, team)
                return None
        except (TypeError, ValueError):
            return None

        # Validate tactical style
        style = data.get("tactical_style", "")
        if style not in _TACTICAL_STYLES:
            data["tactical_style"] = "possession"  # safe fallback

        # Clamp pressing intensity
        try:
            pi = int(data.get("pressing_intensity", 5))
            data["pressing_intensity"] = max(1, min(10, pi))
        except (TypeError, ValueError):
            data["pressing_intensity"] = 5

        data["manager"] = manager
        return data

    # ----- post-match review internals -----

    def _get_recently_finished_matches(self) -> List[Dict[str, Any]]:
        """Get matches finished in the last 2 hours from the static fixture list."""
        try:
            from app.api.matches import _ALL_FIXTURES, _parse_kickoff
        except ImportError:
            return []

        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(hours=2)
        # A match is "finished" if kickoff + ~2h is in the past
        finished = []
        for fix in _ALL_FIXTURES:
            try:
                kickoff = _parse_kickoff(fix["kickoff"]).astimezone(timezone.utc)
                match_end = kickoff + timedelta(hours=2)
                if cutoff <= match_end <= now:
                    finished.append(fix)
            except (ValueError, KeyError):
                continue
        return finished

    def _get_finished_match(self, match_id: int) -> List[Dict[str, Any]]:
        """Get a specific match by ID if it exists."""
        try:
            from app.api.matches import _ALL_FIXTURES
        except ImportError:
            return []
        return [f for f in _ALL_FIXTURES if f.get("id") == match_id]

    def _build_post_match_review(
        self, session: Session, match: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Build a post-match review from community predictions."""
        match_id = match["id"]
        home = match.get("home_team", "Unknown")
        away = match.get("away_team", "Unknown")

        predictions = session.exec(
            select(MatchPrediction).where(MatchPrediction.match_id == match_id)
        ).all()

        total = len(predictions)
        if total == 0:
            return None

        # Result accuracy
        result_counts: Dict[str, int] = {"home": 0, "draw": 0, "away": 0}
        for p in predictions:
            r = p.match_result
            if r in result_counts:
                result_counts[r] += 1

        community_consensus = max(result_counts, key=lambda k: result_counts[k])
        consensus_pct = round((result_counts[community_consensus] / total) * 100)

        # Captain picks (first goalscorer)
        scorer_counts: Dict[str, int] = {}
        for p in predictions:
            pp = p.player_predictions or {}
            scorer = pp.get("first_goalscorer")
            if scorer:
                scorer_counts[scorer] = scorer_counts.get(scorer, 0) + 1

        top_captain = max(scorer_counts, key=lambda k: scorer_counts[k]) if scorer_counts else None
        top_captain_pct = round((scorer_counts[top_captain] / total) * 100) if top_captain else 0

        # Contrarian analysis
        contrarian_count = total - result_counts[community_consensus]

        # Build review data (no actual result comparison — we don't have live scores in static data)
        review = {
            "match_id": match_id,
            "home_team": home,
            "away_team": away,
            "total_predictions": total,
            "result_split": {
                k: round((v / total) * 100) for k, v in result_counts.items()
            },
            "community_consensus": community_consensus,
            "consensus_pct": consensus_pct,
            "contrarian_count": contrarian_count,
            "top_captain": top_captain,
            "top_captain_pct": top_captain_pct,
            "ai_narrative": None,
        }

        # Generate narrative via Groq
        narrative = self._call_groq_post_match(home, away, review)
        if narrative:
            review["ai_narrative"] = narrative

        return review

    def _call_groq_post_match(
        self, home: str, away: str, stats: Dict[str, Any]
    ) -> Optional[str]:
        """Generate a post-match narrative from community stats."""
        prompt = (
            f"You are FanXI's post-match analyst.\n"
            f"{home} vs {away} just finished at the FIFA World Cup 2026.\n\n"
            f"Community stats:\n"
            f"- {stats['total_predictions']} FanXI scouts predicted this match\n"
            f"- Community consensus: {stats['community_consensus']} win ({stats['consensus_pct']}%)\n"
            f"- {stats['contrarian_count']} scouts went against the consensus\n"
            f"- Top captain pick: {stats.get('top_captain', 'N/A')} ({stats.get('top_captain_pct', 0)}%)\n\n"
            f"Generate a punchy 3-sentence post-match debrief for FanXI scouts. "
            f"Reference the community stats. Be specific, conversational, slightly dramatic. "
            f"Under 60 words. Return ONLY the text, no JSON."
        )
        try:
            from groq import Groq
            from app.config import settings

            if not settings.groq_api_key:
                return None

            client = Groq(api_key=settings.groq_api_key)
            result = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are a football analyst. Be concise and dramatic."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.8,
                max_tokens=150,
            )
            return result.choices[0].message.content.strip()
        except Exception as exc:
            logger.warning("VISION: Groq post-match narrative failed: %s", exc)
            return None

    # ----- shared fixture helpers -----

    def _get_upcoming_fixtures(
        self, hours_ahead: int = 48, limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get upcoming matches from the static fixture list."""
        try:
            from app.api.matches import _ALL_FIXTURES, _parse_kickoff
        except ImportError:
            return []

        now = datetime.now(timezone.utc)
        cutoff = now + timedelta(hours=hours_ahead)
        upcoming = []
        for fix in _ALL_FIXTURES:
            try:
                kickoff = _parse_kickoff(fix["kickoff"]).astimezone(timezone.utc)
                if now < kickoff <= cutoff:
                    upcoming.append(fix)
            except (ValueError, KeyError):
                continue
        return upcoming[:limit]

    # ----- shared Groq caller -----

    def _call_groq(self, prompt: str, retries: int = 1) -> Optional[Dict[str, Any]]:
        """Call Groq with a prompt expecting JSON response.  Retries once on parse failure."""
        try:
            from groq import Groq
            from app.config import settings

            if not settings.groq_api_key:
                logger.warning("VISION: No GROQ_API_KEY set — skipping")
                return None

            client = Groq(api_key=settings.groq_api_key)
        except Exception as exc:
            logger.warning("VISION: Groq client init failed: %s", exc)
            return None

        for attempt in range(1 + retries):
            try:
                result = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": "You are a football data expert. Return only valid JSON."},
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.7,
                    max_tokens=800,
                )
                raw = result.choices[0].message.content.strip()
                # Strip markdown fences
                if raw.startswith("```"):
                    raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
                if raw.endswith("```"):
                    raw = raw[:-3].strip()
                if raw.startswith("json"):
                    raw = raw[4:].strip()

                return json.loads(raw)

            except json.JSONDecodeError:
                if attempt < retries:
                    logger.warning("VISION: Groq JSON parse failed, retrying (attempt %d)", attempt + 1)
                    continue
                logger.warning("VISION: Groq JSON parse failed after %d attempts", attempt + 1)
                return None
            except Exception as exc:
                logger.warning("VISION: Groq call failed: %s", exc)
                return None

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
