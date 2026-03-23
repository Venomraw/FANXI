"""
NATASHA — Black Widow — Shield Division

Secrets guardian + auth watchdog.  First agent in the Avengers Initiative.

Responsibilities:
  1. secrets_scan  — scans .env for exposed keys, checks git history,
                     verifies .gitignore coverage.  Runs every 24 h.
  2. auth_watchdog — queries AuthEvent table for brute-force, impossible-
                     travel, and token-replay patterns.  Runs every 5 min.

Severity scale (0–100):
  0–39  INFO     — all clear, logged for audit trail
  40–79 WARNING  — something fishy, logged + highlighted in briefing
  80–99 CRITICAL — writes to approval_queue, founder must review
  100   AUTOBAN  — auto-bans the IP immediately (only auto-action)
"""
import logging
import os
import re
import subprocess
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from sqlmodel import Session, select, func

from app.db import engine
from app.models import AgentRun, ApprovalQueue, AuthEvent

logger = logging.getLogger("fanxi.agents.natasha")

# ---------------------------------------------------------------------------
# Key patterns — regex patterns that match common secret formats
# ---------------------------------------------------------------------------
_KEY_PATTERNS: List[Tuple[str, re.Pattern]] = [
    ("API Key (generic)",       re.compile(r"^[A-Za-z0-9_]+=.{16,}$")),
    ("Bearer / JWT",            re.compile(r"(eyJ[A-Za-z0-9_-]{10,})")),
    ("AWS Access Key",          re.compile(r"AKIA[0-9A-Z]{16}")),
    ("Google OAuth Secret",     re.compile(r"GOCSPX-[A-Za-z0-9_-]{20,}")),
    ("Hex secret (32+ chars)",  re.compile(r"^[0-9a-fA-F]{32,}$")),
    ("Neon / Postgres DSN",     re.compile(r"postgresql://[^\s]+")),
    ("Resend key",              re.compile(r"re_[A-Za-z0-9_]{16,}")),
    ("Groq key",                re.compile(r"gsk_[A-Za-z0-9_]{20,}")),
    ("Google API key",          re.compile(r"AIzaSy[A-Za-z0-9_-]{30,}")),
]

# Env vars that are safe / not secrets
_SAFE_VARS = {
    "FOOTBALL_API_BASE_URL", "FOOTBALL_LALIGA_ID", "FOOTBALL_SEASON",
    "FANXI_ENV", "FANXI_RELEASE", "FANXI_HOST", "FANXI_PORT",
    "FANXI_WORKERS", "LOG_LEVEL", "FRONTEND_URL", "GOOGLE_REDIRECT_URI",
    "FANXI_CORS_ORIGIN",
}

# Backend root — two levels up from this file
_BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent


class Natasha:
    """Black Widow — secrets guardian + auth watchdog."""

    AGENT = "NATASHA"
    DEPARTMENT = "shield"

    # ----- public interface -----

    def run_secrets_scan(self) -> Dict[str, Any]:
        """Full secrets audit.  Returns the AgentRun-shaped result dict."""
        findings: List[Dict[str, Any]] = []
        actions: List[str] = []

        findings.extend(self._scan_env_file())
        findings.extend(self._check_gitignore())
        findings.extend(self._scan_git_history())

        severity = self._max_severity(findings)

        result = self._build_result("secrets_scan", severity, findings, actions)

        # Persist
        self._save_run(result)
        if severity >= 80:
            self._escalate(result)

        logger.info(
            "NATASHA_SECRETS_SCAN severity=%d findings=%d",
            severity, len(findings),
        )
        return result

    def run_auth_watchdog(self) -> Dict[str, Any]:
        """Auth pattern analysis.  Returns the AgentRun-shaped result dict."""
        findings: List[Dict[str, Any]] = []
        actions: List[str] = []

        with Session(engine) as session:
            findings.extend(self._detect_brute_force(session))
            findings.extend(self._detect_impossible_travel(session))
            findings.extend(self._detect_token_replay(session))

        severity = self._max_severity(findings)

        # Severity 100 = auto-ban
        if severity >= 100:
            auto_banned = self._auto_ban_ips(findings)
            actions.extend(auto_banned)

        result = self._build_result("auth_watchdog", severity, findings, actions)

        self._save_run(result)
        if 80 <= severity < 100:
            self._escalate(result)

        logger.info(
            "NATASHA_AUTH_WATCHDOG severity=%d findings=%d actions=%d",
            severity, len(findings), len(actions),
        )
        return result

    def report(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Return the latest N runs for NATASHA."""
        with Session(engine) as session:
            runs = session.exec(
                select(AgentRun)
                .where(AgentRun.agent == self.AGENT)
                .order_by(AgentRun.created_at.desc())
                .limit(limit)
            ).all()
            return [self._run_to_dict(r) for r in runs]

    # ----- secrets scan internals -----

    def _scan_env_file(self) -> List[Dict[str, Any]]:
        """Scan backend/.env for keys matching secret patterns."""
        findings = []
        env_path = _BACKEND_ROOT / ".env"

        if not env_path.exists():
            findings.append({
                "check": "env_file_exists",
                "severity": 0,
                "message": ".env file not found — no secrets to scan",
            })
            return findings

        for line in env_path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")

            if key in _SAFE_VARS or not value:
                continue

            for pattern_name, pattern in _KEY_PATTERNS:
                if pattern.search(value):
                    findings.append({
                        "check": "env_secret_detected",
                        "severity": 70,
                        "key": key,
                        "pattern": pattern_name,
                        "value_preview": value[:6] + "..." + value[-4:] if len(value) > 14 else "***",
                        "message": f"Secret detected in .env: {key} matches [{pattern_name}]",
                    })
                    break  # one match per key is enough

        if not findings:
            findings.append({
                "check": "env_clean",
                "severity": 0,
                "message": ".env scanned — no obvious secrets found",
            })

        return findings

    def _check_gitignore(self) -> List[Dict[str, Any]]:
        """Verify .env is in .gitignore."""
        findings = []
        gitignore_path = _BACKEND_ROOT.parent / ".gitignore"

        if not gitignore_path.exists():
            findings.append({
                "check": "gitignore_missing",
                "severity": 90,
                "message": "No .gitignore found at project root — secrets may be committed",
            })
            return findings

        content = gitignore_path.read_text()
        env_patterns = [".env", "backend/.env"]
        covered = [p for p in env_patterns if p in content]

        if not covered:
            findings.append({
                "check": "gitignore_env_missing",
                "severity": 90,
                "message": ".gitignore exists but does not exclude .env files",
            })
        else:
            findings.append({
                "check": "gitignore_ok",
                "severity": 0,
                "message": f".gitignore covers: {covered}",
            })

        return findings

    def _scan_git_history(self) -> List[Dict[str, Any]]:
        """Check if .env was ever committed to git."""
        findings = []

        try:
            result = subprocess.run(
                ["git", "log", "--all", "--diff-filter=A", "--name-only",
                 "--pretty=format:", "--", "*.env", "backend/.env", ".env"],
                capture_output=True, text=True, timeout=10,
                cwd=str(_BACKEND_ROOT.parent),
            )
            tracked_files = [
                f.strip() for f in result.stdout.splitlines() if f.strip()
            ]

            if tracked_files:
                findings.append({
                    "check": "env_in_git_history",
                    "severity": 85,
                    "files": tracked_files,
                    "message": f".env was committed to git history: {tracked_files}. "
                               "Secrets may be exposed. Consider git filter-branch or BFG.",
                })
            else:
                findings.append({
                    "check": "git_history_clean",
                    "severity": 0,
                    "message": "No .env files found in git history — clean",
                })
        except (subprocess.TimeoutExpired, FileNotFoundError) as exc:
            findings.append({
                "check": "git_scan_error",
                "severity": 30,
                "message": f"Could not scan git history: {exc}",
            })

        return findings

    # ----- auth watchdog internals -----

    def _detect_brute_force(self, session: Session) -> List[Dict[str, Any]]:
        """Flag IPs with >5 failed logins in 60 seconds."""
        findings = []
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=1)

        # Group failed logins by IP in the last 60 seconds
        events = session.exec(
            select(AuthEvent)
            .where(
                AuthEvent.event_type == "login_failure",
                AuthEvent.created_at >= cutoff,
            )
        ).all()

        ip_counts: Dict[str, int] = defaultdict(int)
        for e in events:
            ip_counts[e.ip_address] += 1

        for ip, count in ip_counts.items():
            if count > 5:
                severity = 100 if count > 20 else 85
                findings.append({
                    "check": "brute_force",
                    "severity": severity,
                    "ip": ip,
                    "failed_attempts": count,
                    "window": "60s",
                    "message": f"Brute force detected: {ip} had {count} failed logins in 60s",
                })

        return findings

    def _detect_impossible_travel(self, session: Session) -> List[Dict[str, Any]]:
        """Flag accounts logged in from 2 different countries within 1 hour."""
        findings = []
        cutoff = datetime.now(timezone.utc) - timedelta(hours=1)

        events = session.exec(
            select(AuthEvent)
            .where(
                AuthEvent.event_type == "login_success",
                AuthEvent.created_at >= cutoff,
                AuthEvent.country.isnot(None),  # type: ignore[union-attr]
            )
            .order_by(AuthEvent.created_at)
        ).all()

        # Group by user_id
        user_events: Dict[Optional[int], List[AuthEvent]] = defaultdict(list)
        for e in events:
            user_events[e.user_id].append(e)

        for user_id, evts in user_events.items():
            if user_id is None:
                continue
            countries = {e.country for e in evts if e.country}
            if len(countries) >= 2:
                findings.append({
                    "check": "impossible_travel",
                    "severity": 80,
                    "user_id": user_id,
                    "countries": sorted(countries),
                    "message": f"User {user_id} logged in from {sorted(countries)} within 1 hour",
                })

        return findings

    def _detect_token_replay(self, session: Session) -> List[Dict[str, Any]]:
        """Flag any token_replay events (written by the refresh endpoint)."""
        findings = []
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=5)

        replays = session.exec(
            select(AuthEvent)
            .where(
                AuthEvent.event_type == "token_replay",
                AuthEvent.created_at >= cutoff,
            )
        ).all()

        for e in replays:
            findings.append({
                "check": "token_replay",
                "severity": 90,
                "user_id": e.user_id,
                "ip": e.ip_address,
                "message": f"Token replay detected for user {e.user_id} from {e.ip_address}",
            })

        return findings

    # ----- auto-actions -----

    def _auto_ban_ips(self, findings: List[Dict[str, Any]]) -> List[str]:
        """
        Auto-ban IPs with severity == 100.  Writes an approval record
        with status='auto_executed' for audit trail.
        """
        actions = []
        for f in findings:
            if f.get("severity", 0) >= 100 and f.get("ip"):
                ip = f["ip"]
                # Write audit record
                with Session(engine) as session:
                    record = ApprovalQueue(
                        agent=self.AGENT,
                        department=self.DEPARTMENT,
                        action_type="ban_ip",
                        action_data={"ip": ip, "reason": f["message"]},
                        severity=100,
                        reason=f["message"],
                        status="auto_executed",
                    )
                    session.add(record)
                    session.commit()
                actions.append(f"AUTO_BAN ip={ip}")
                logger.warning("NATASHA_AUTO_BAN ip=%s reason=%s", ip, f["message"])
        return actions

    # ----- helpers -----

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
            summary += f", {len(actions)} auto-action(s)"

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
