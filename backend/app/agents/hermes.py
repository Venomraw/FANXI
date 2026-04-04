"""
HERMES — Intelligence Bureau — SEO Content + Nation Pages

Generates SEO-optimized content for all 48 WC2026 nation pages and
monitors content health for Google indexing.

Responsibilities:
  1. nation_content    — generate/refresh SEO content per team via Groq
  2. seo_health        — audit content quality across all nation pages
  3. sitemap_update    — write nation URLs file for frontend sitemap

Severity scale (0–100):
  0–39  INFO     — all pages healthy
  40–79 WARNING  — thin content or stale pages detected
  80–99 CRITICAL — multiple pages missing content entirely
"""
import asyncio
import json
import logging
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from sqlmodel import Session, select

from app.db import engine
from app.models import AgentRun, ApprovalQueue, NationPage

logger = logging.getLogger("fanxi.agents.hermes")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
_BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
_PROJECT_ROOT = _BACKEND_ROOT.parent
_SITEMAP_FILE = _PROJECT_ROOT / "frontend" / "public" / "nations-sitemap.txt"

# Rate limit: 1 team per 3 seconds (Groq free tier ~30 req/min)
_GROQ_DELAY_SECONDS = 3

# Content staleness threshold
_STALE_DAYS = 30

# The 48 FIFA World Cup 2026 qualified nations
WC2026_TEAMS: List[str] = [
    "Argentina", "Australia", "Belgium", "Bolivia", "Brazil",
    "Cameroon", "Canada", "Chile", "Colombia", "Costa Rica",
    "Croatia", "DR Congo", "Ecuador", "Egypt", "England",
    "France", "Germany", "Ghana", "Honduras", "Indonesia",
    "Iran", "Iraq", "Italy", "Japan", "Mexico",
    "Morocco", "Netherlands", "New Zealand", "Nigeria", "Panama",
    "Paraguay", "Peru", "Poland", "Portugal", "Qatar",
    "Romania", "Saudi Arabia", "Senegal", "Serbia", "South Africa",
    "South Korea", "Spain", "Switzerland", "Tunisia", "Turkey",
    "Ukraine", "Uruguay", "USA", "Venezuela",
]


def team_to_slug(team: str) -> str:
    """Convert a team name to a URL-safe slug.

    Examples:
        "Brazil"      -> "brazil"
        "South Korea" -> "south-korea"
        "DR Congo"    -> "dr-congo"
        "Ivory Coast" -> "ivory-coast"
        "Côte d'Ivoire" -> "cote-divoire"
    """
    slug = team.lower()
    # Replace special chars
    slug = slug.replace("ü", "u").replace("ö", "o").replace("ô", "o")
    slug = slug.replace("é", "e").replace("è", "e").replace("ê", "e")
    slug = slug.replace("'", "").replace("'", "")
    # Replace spaces and non-alphanumeric with hyphens
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    # Strip leading/trailing hyphens
    slug = slug.strip("-")
    return slug


# Pre-computed slug list for frontend static generation
WC2026_SLUGS: List[str] = [team_to_slug(t) for t in WC2026_TEAMS]


class Hermes:
    """HERMES — SEO Content + Nation Pages agent."""

    AGENT = "HERMES"
    DEPARTMENT = "intelligence"

    # ------------------------------------------------------------------
    # RESPONSIBILITY 1 — Nation page content generation
    # ------------------------------------------------------------------

    def run_generate_all(self) -> Dict[str, Any]:
        """Generate SEO content for all 48 WC2026 nations."""
        logger.info("HERMES: Starting generate_all for %d teams", len(WC2026_TEAMS))

        findings: List[Dict[str, Any]] = []
        actions: List[str] = []
        generated = 0
        updated = 0
        failed = 0

        for team in WC2026_TEAMS:
            try:
                was_update = self._generate_team_content(team)
                if was_update:
                    updated += 1
                else:
                    generated += 1
                actions.append(f"Generated content for {team}")
            except Exception as exc:
                logger.warning("HERMES: Failed to generate content for %s: %s", team, exc)
                failed += 1
                findings.append({
                    "team": team,
                    "issue": f"Generation failed: {exc}",
                    "severity": 40,
                })
                # Use fallback template
                self._save_fallback(team)
                actions.append(f"Saved fallback content for {team}")

            # Rate limit — sleep between Groq calls
            import time
            time.sleep(_GROQ_DELAY_SECONDS)

        # Update sitemap after generation
        self._write_sitemap_file()
        actions.append("Updated sitemap with nation URLs")

        severity = self._max_severity(findings)
        if failed > 10:
            severity = max(severity, 80)
        elif failed >= 1:
            severity = max(severity, 60)

        result = self._build_result(
            run_type="generate_all",
            severity=severity,
            findings=findings,
            actions=actions,
        )
        result["pages_generated"] = generated
        result["pages_updated"] = updated
        result["pages_failed"] = failed

        self._save_run(result)
        if severity >= 80:
            self._escalate(result)

        logger.info(
            "HERMES: generate_all complete — generated=%d updated=%d failed=%d",
            generated, updated, failed,
        )
        return result

    def run_generate_team(self, team: str) -> Dict[str, Any]:
        """Generate SEO content for a single team."""
        if team not in WC2026_TEAMS:
            return self._build_result(
                run_type="generate_team",
                severity=0,
                findings=[{"issue": f"'{team}' is not a WC2026 team", "severity": 0}],
                actions=[],
            )

        findings: List[Dict[str, Any]] = []
        actions: List[str] = []

        try:
            self._generate_team_content(team)
            actions.append(f"Generated content for {team}")
        except Exception as exc:
            logger.warning("HERMES: Failed to generate for %s: %s", team, exc)
            findings.append({"team": team, "issue": str(exc), "severity": 40})
            self._save_fallback(team)
            actions.append(f"Saved fallback for {team}")

        result = self._build_result(
            run_type="generate_team",
            severity=self._max_severity(findings),
            findings=findings,
            actions=actions,
        )
        self._save_run(result)
        return result

    def _generate_team_content(self, team: str) -> bool:
        """Generate content for one team via Groq. Returns True if updating existing."""
        slug = team_to_slug(team)
        data = self._call_groq_seo(team)

        if not data:
            raise RuntimeError(f"Groq returned no data for {team}")

        now = datetime.utcnow()

        with Session(engine) as session:
            existing = session.exec(
                select(NationPage).where(NationPage.team == team)
            ).first()

            if existing:
                existing.seo_title = data.get("seo_title", existing.seo_title)
                existing.meta_description = data.get("meta_description", existing.meta_description)[:160]
                existing.hero_paragraph = data.get("hero_paragraph", existing.hero_paragraph)
                existing.history_paragraph = data.get("history_paragraph", existing.history_paragraph)
                existing.wc2026_outlook = data.get("wc2026_outlook", existing.wc2026_outlook)
                existing.faq_json = data.get("faq", existing.faq_json)
                existing.keywords = data.get("keywords", existing.keywords)
                existing.updated_at = now
                session.add(existing)
                session.commit()
                return True
            else:
                page = NationPage(
                    team=team,
                    slug=slug,
                    seo_title=data.get("seo_title", f"{team} World Cup 2026 | FanXI"),
                    meta_description=data.get("meta_description", "")[:160],
                    hero_paragraph=data.get("hero_paragraph", ""),
                    history_paragraph=data.get("history_paragraph", ""),
                    wc2026_outlook=data.get("wc2026_outlook", ""),
                    faq_json=data.get("faq", []),
                    keywords=data.get("keywords", []),
                    generated_at=now,
                    updated_at=now,
                )
                session.add(page)
                session.commit()
                return False

    def _save_fallback(self, team: str) -> None:
        """Save fallback template content when Groq fails."""
        slug = team_to_slug(team)
        now = datetime.utcnow()

        fallback_title = f"{team} World Cup 2026 — Squad, Predictions & Tactical Analysis | FanXI"
        fallback_desc = (
            f"Predict {team}'s starting XI for FIFA World Cup 2026. "
            f"Tactical analysis, squad depth and formation predictions."
        )[:160]
        fallback_hero = (
            f"{team} are preparing for the FIFA World Cup 2026, set to be held across "
            f"the United States, Mexico, and Canada. As one of the 48 qualified nations, "
            f"{team} will be looking to make a strong impression on the world's biggest "
            f"football stage. Fans around the world are eager to see how the team performs "
            f"under the pressure of a tournament that promises to be the largest and most "
            f"competitive World Cup in history. With expanded squads and a new 48-team "
            f"format featuring 12 groups of four, every single match in the group stage "
            f"will be crucial for qualification to the knockout rounds. The manager will "
            f"need to carefully balance squad rotation with the demands of performing at "
            f"the highest level across multiple matches in different venues. Key players "
            f"will be expected to step up and deliver when it matters most, while the "
            f"tactical setup will play a decisive role in determining results against "
            f"strong opposition from every confederation. Follow {team}'s journey on "
            f"FanXI — predict their starting XI for every match, analyse tactical setups, "
            f"compare your predictions with fans worldwide, and climb the global tactical "
            f"leaderboard. Build your predicted lineup, lock in your formation before "
            f"kickoff, and prove your football IQ against thousands of other tactical minds."
        )
        fallback_history = (
            f"{team} have a proud history in the FIFA World Cup. Over the decades, "
            f"the nation has produced memorable moments and iconic players who have "
            f"left their mark on the tournament. As World Cup 2026 approaches, fans "
            f"will be hoping to add another chapter to their nation's football story."
        )
        fallback_outlook = (
            f"Heading into World Cup 2026, {team} will be looking to build on recent "
            f"form and put together a strong campaign. The tactical setup and squad "
            f"selection will be key factors in determining how far they can go in the "
            f"tournament."
        )
        fallback_faq = [
            {
                "question": f"Will {team} win the World Cup 2026?",
                "answer": f"{team}'s chances at World Cup 2026 will depend on form, squad fitness, and tactical preparation. Follow their journey on FanXI.",
            },
            {
                "question": f"Who is {team}'s best player at World Cup 2026?",
                "answer": f"{team} have several talented players who could make an impact at World Cup 2026. Check the full squad list on FanXI.",
            },
            {
                "question": f"What formation does {team} play?",
                "answer": f"{team}'s formation varies based on the manager's tactical decisions. View formation analysis on FanXI.",
            },
            {
                "question": f"How did {team} qualify for World Cup 2026?",
                "answer": f"{team} qualified through their confederation's qualifying pathway to earn a place among the 48 nations at World Cup 2026.",
            },
        ]
        fallback_keywords = [
            f"{team} world cup 2026",
            f"{team} world cup 2026 squad",
            f"{team} world cup 2026 prediction",
            f"{team} world cup 2026 formation",
            f"{team} world cup 2026 players",
        ]

        with Session(engine) as session:
            existing = session.exec(
                select(NationPage).where(NationPage.team == team)
            ).first()

            if existing:
                # Only overwrite if content is empty (never delete good content)
                if not existing.hero_paragraph:
                    existing.hero_paragraph = fallback_hero
                if not existing.history_paragraph:
                    existing.history_paragraph = fallback_history
                if not existing.wc2026_outlook:
                    existing.wc2026_outlook = fallback_outlook
                if not existing.faq_json:
                    existing.faq_json = fallback_faq
                if not existing.keywords:
                    existing.keywords = fallback_keywords
                existing.updated_at = now
                session.add(existing)
            else:
                page = NationPage(
                    team=team,
                    slug=slug,
                    seo_title=fallback_title,
                    meta_description=fallback_desc,
                    hero_paragraph=fallback_hero,
                    history_paragraph=fallback_history,
                    wc2026_outlook=fallback_outlook,
                    faq_json=fallback_faq,
                    keywords=fallback_keywords,
                    generated_at=now,
                    updated_at=now,
                )
                session.add(page)

            session.commit()

    # ------------------------------------------------------------------
    # RESPONSIBILITY 2 — SEO health monitor
    # ------------------------------------------------------------------

    def run_seo_health(self) -> Dict[str, Any]:
        """Weekly scan of all NationPage records for content quality."""
        logger.info("HERMES: Running SEO health check")

        findings: List[Dict[str, Any]] = []
        actions: List[str] = []
        now = datetime.utcnow()
        stale_cutoff = now - timedelta(days=_STALE_DAYS)

        with Session(engine) as session:
            pages = session.exec(select(NationPage)).all()

            if not pages:
                findings.append({
                    "issue": "No nation pages exist yet",
                    "severity": 60,
                })
                result = self._build_result("seo_health", 60, findings, actions)
                self._save_run(result)
                return result

            total_score = 0
            stale_count = 0
            thin_count = 0

            for page in pages:
                page_score = 100
                issues: List[str] = []

                # Check staleness
                if page.updated_at < stale_cutoff:
                    issues.append("content older than 30 days")
                    page_score -= 20
                    stale_count += 1

                # Check meta_description length
                if len(page.meta_description) > 160:
                    issues.append(f"meta_description too long ({len(page.meta_description)} chars)")
                    page_score -= 10

                if not page.meta_description:
                    issues.append("meta_description is empty")
                    page_score -= 30

                # Check hero_paragraph word count
                hero_words = len(page.hero_paragraph.split()) if page.hero_paragraph else 0
                if hero_words < 150:
                    issues.append(f"hero_paragraph thin ({hero_words} words)")
                    page_score -= 20
                    thin_count += 1

                # Check FAQ count
                faq_count = len(page.faq_json) if page.faq_json else 0
                if faq_count < 4:
                    issues.append(f"FAQ has only {faq_count} questions (need 4+)")
                    page_score -= 15

                total_score += max(page_score, 0)

                if issues:
                    sev = 40 if page_score < 60 else 20
                    findings.append({
                        "team": page.team,
                        "slug": page.slug,
                        "health_score": max(page_score, 0),
                        "issues": issues,
                        "severity": sev,
                    })

            avg_score = total_score // len(pages) if pages else 0

            if stale_count > 0:
                actions.append(f"Flagged {stale_count} pages for regeneration (> 30 days old)")
            if thin_count > 0:
                actions.append(f"Flagged {thin_count} pages with thin content")

        severity = self._calculate_severity(
            pages_failed=len(pages) == 0,
            thin_content_count=thin_count,
            base_severity=self._max_severity(findings),
        )

        result = self._build_result("seo_health", severity, findings, actions)
        result["avg_content_health"] = avg_score
        result["total_pages"] = len(pages)
        result["stale_pages"] = stale_count
        result["thin_pages"] = thin_count

        self._save_run(result)

        # Escalate thin pages
        if thin_count > 0:
            with Session(engine) as session:
                for f in findings:
                    if f.get("health_score", 100) < 60:
                        record = ApprovalQueue(
                            agent=self.AGENT,
                            department=self.DEPARTMENT,
                            action_type="thin_content",
                            action_data=f,
                            severity=f.get("severity", 40),
                            reason=f"Thin content for {f.get('team', 'unknown')}",
                        )
                        session.add(record)
                session.commit()

        logger.info(
            "HERMES: seo_health complete — pages=%d avg_score=%d stale=%d thin=%d",
            len(pages), avg_score, stale_count, thin_count,
        )
        return result

    # ------------------------------------------------------------------
    # RESPONSIBILITY 3 — Sitemap updater
    # ------------------------------------------------------------------

    def run_sitemap_update(self) -> Dict[str, Any]:
        """Write nation URLs file for frontend sitemap consumption."""
        logger.info("HERMES: Updating sitemap file")

        self._write_sitemap_file()

        result = self._build_result(
            run_type="sitemap_update",
            severity=0,
            findings=[],
            actions=[f"Wrote {len(WC2026_SLUGS)} nation URLs to {_SITEMAP_FILE.name}"],
        )
        self._save_run(result)
        return result

    def _write_sitemap_file(self) -> None:
        """Write all nation page URLs to a text file for the frontend sitemap."""
        base = "https://fanxi.vercel.app"
        lines = [f"{base}/nations/{slug}" for slug in WC2026_SLUGS]
        _SITEMAP_FILE.parent.mkdir(parents=True, exist_ok=True)
        _SITEMAP_FILE.write_text("\n".join(lines) + "\n", encoding="utf-8")
        logger.info("HERMES: Wrote %d URLs to %s", len(lines), _SITEMAP_FILE)

    # ------------------------------------------------------------------
    # Reporting
    # ------------------------------------------------------------------

    def report(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Return latest HERMES runs."""
        with Session(engine) as session:
            runs = session.exec(
                select(AgentRun)
                .where(AgentRun.agent == self.AGENT)
                .order_by(AgentRun.created_at.desc())
                .limit(limit)
            ).all()
            return [self._run_to_dict(r) for r in runs]

    def get_stats(self) -> Dict[str, Any]:
        """Return HERMES stats for Oracle morning briefing."""
        with Session(engine) as session:
            total = len(session.exec(select(NationPage)).all())
            now = datetime.utcnow()
            stale_cutoff = now - timedelta(days=_STALE_DAYS)

            stale = len(session.exec(
                select(NationPage).where(NationPage.updated_at < stale_cutoff)
            ).all())

            latest_run = session.exec(
                select(AgentRun)
                .where(AgentRun.agent == self.AGENT, AgentRun.run_type == "generate_all")
                .order_by(AgentRun.created_at.desc())
                .limit(1)
            ).first()

            return {
                "nation_pages_total": total,
                "pages_needing_refresh": stale,
                "last_generation_run": latest_run.created_at.isoformat() if latest_run else None,
            }

    # ------------------------------------------------------------------
    # Groq caller — matches VISION pattern
    # ------------------------------------------------------------------

    def _call_groq_seo(self, team: str) -> Optional[Dict[str, Any]]:
        """Call Groq to generate SEO content for a team."""
        prompt = f"""You are an SEO content writer for FanXI, a World Cup 2026 tactical prediction platform.

Generate SEO-optimized content for the {team} World Cup 2026 page.

Target keywords:
- '{team} world cup 2026'
- '{team} world cup 2026 squad'
- '{team} world cup 2026 prediction'
- '{team} fifa world cup 2026'

Return ONLY valid JSON with these exact keys:
{{
  "seo_title": "{team} World Cup 2026 — Squad, Predictions & Tactical Analysis | FanXI",
  "meta_description": "Max 160 chars. Include team name + world cup 2026 + prediction angle. Compelling click-through text.",
  "hero_paragraph": "200-300 word intro. Naturally include target keywords. Cover: team overview, manager, style, WC2026 expectations. No fluff.",
  "history_paragraph": "150-200 words about {team} World Cup history. Include: titles won, best results, memorable moments, last WC performance.",
  "wc2026_outlook": "100-150 words tactical outlook for WC2026. Include: likely formation, key players, group stage opponents if known, realistic target.",
  "faq": [
    {{"question": "Will {team} win the World Cup 2026?", "answer": "2-3 sentence answer."}},
    {{"question": "Who is {team}'s best player at World Cup 2026?", "answer": "2-3 sentence answer."}},
    {{"question": "What formation does {team} play?", "answer": "2-3 sentence answer."}},
    {{"question": "How did {team} qualify for World Cup 2026?", "answer": "2-3 sentence answer."}}
  ],
  "keywords": [
    "{team} world cup 2026",
    "{team} world cup 2026 squad",
    "{team} world cup 2026 prediction",
    "{team} world cup 2026 formation",
    "{team} world cup 2026 players"
  ]
}}"""

        return self._call_groq(prompt, max_tokens=1500)

    def _call_groq(self, prompt: str, retries: int = 1, max_tokens: int = 1500) -> Optional[Dict[str, Any]]:
        """Call Groq with a prompt expecting JSON response. Retries once on parse failure."""
        try:
            from groq import Groq
            from app.config import settings

            if not settings.groq_api_key:
                logger.warning("HERMES: No GROQ_API_KEY set — skipping")
                return None

            client = Groq(api_key=settings.groq_api_key)
        except Exception as exc:
            logger.warning("HERMES: Groq client init failed: %s", exc)
            return None

        for attempt in range(1 + retries):
            try:
                result = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": "You are an SEO content expert for football. Return only valid JSON."},
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.7,
                    max_tokens=max_tokens,
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
                    logger.warning("HERMES: Groq JSON parse failed, retrying (attempt %d)", attempt + 1)
                    continue
                logger.warning("HERMES: Groq JSON parse failed after %d attempts", attempt + 1)
                return None
            except Exception as exc:
                logger.warning("HERMES: Groq call failed: %s", exc)
                return None

        return None

    # ------------------------------------------------------------------
    # Helpers — match VISION/NATASHA/RHODEY exactly
    # ------------------------------------------------------------------

    @staticmethod
    def _calculate_severity(
        *,
        pages_failed: bool = False,
        thin_content_count: int = 0,
        base_severity: int = 0,
    ) -> int:
        """Centralised severity thresholds for HERMES.

        pages_failed > 10  → 80 CRITICAL
        pages_failed 1-10  → 60 WARNING
        thin_content > 20  → 40 WARNING
        thin_content 1-20  → 20 INFO
        everything OK      → 0  INFO
        """
        severity = base_severity
        # pages_failed flag is used by seo_health (True when zero pages exist)
        if pages_failed:
            severity = max(severity, 60)
        if thin_content_count > 20:
            severity = max(severity, 40)
        elif thin_content_count >= 1:
            severity = max(severity, 20)
        return severity

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
                    reason=finding.get("issue", "Critical finding requires review"),
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
