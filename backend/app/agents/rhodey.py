"""
RHODEY — War Machine — Engineering Corps

CI Guardian agent.  Scans the repository for CI/CD pipeline gaps,
code quality violations (print statements, console.log, hardcoded URLs),
and proposes a gold-standard GitHub Actions workflow.

Responsibilities:
  1. ci_scan           — audit CI config, code quality, and frontend hygiene
  2. propose_pipeline  — write ci.proposed.yml with a gold-standard workflow
  3. detect_activation — check if a previous proposal was adopted

Severity scale (0–100):
  0–39  INFO     — CI is solid, minor nits only
  40–79 WARNING  — real gaps, proposal generated
  80–99 CRITICAL — no CI or secrets in workflow files
"""
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from sqlmodel import Session, select

from app.db import engine
from app.models import AgentRun, ApprovalQueue

logger = logging.getLogger("fanxi.agents.rhodey")

# ---------------------------------------------------------------------------
# Path constants
# ---------------------------------------------------------------------------
_BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
_PROJECT_ROOT = _BACKEND_ROOT.parent
_WORKFLOWS_DIR = _PROJECT_ROOT / ".github" / "workflows"
_PROPOSED_FILE = _WORKFLOWS_DIR / "ci.proposed.yml"

# ---------------------------------------------------------------------------
# Files / dirs to skip when scanning for violations
# ---------------------------------------------------------------------------
_PRINT_EXCLUDE_FILES = {"conftest.py"}
_PRINT_EXCLUDE_DIRS = {"tests", "__pycache__", ".venv", "agents"}

_URL_EXCLUDE_FILES = {"config.py", "conftest.py", ".env.example", ".env.local"}
_URL_EXCLUDE_DIRS = {"tests", "__pycache__", "node_modules", ".next"}

# Pattern that matches env-var fallback pattern — these are acceptable
_ENV_FALLBACK_RE = re.compile(
    r"process\.env\.\w+\s*\|\|?\s*['\"]http://localhost",
)


class Rhodey:
    """War Machine — CI guardian for the Engineering Corps."""

    AGENT = "RHODEY"
    DEPARTMENT = "engineering"

    # ----- public interface -----

    def run_ci_scan(self, scan_only: bool = False) -> Dict[str, Any]:
        """
        Full CI audit.  If scan_only=False (default), also generates a
        proposed workflow file when gaps are found.
        """
        findings: List[Dict[str, Any]] = []
        actions: List[str] = []

        # 0. Check if a previous proposal was activated
        activation = self._detect_activation()
        if activation:
            findings.append(activation)
            result = self._build_result("ci_scan", 0, findings, actions)
            self._save_run(result)
            return result

        # 1. Scan GitHub Actions workflows
        findings.extend(self._scan_workflows())

        # 2. Scan backend for print() statements
        findings.extend(self._scan_print_statements())

        # 3. Scan frontend for console.log and hardcoded URLs
        findings.extend(self._scan_console_logs())
        findings.extend(self._scan_hardcoded_urls())

        severity = self._max_severity(findings)
        run_type = "ci_scan"

        # 4. Generate proposal if gaps found and not scan_only
        if not scan_only and severity >= 40:
            proposed = self._write_proposed_pipeline(severity, findings)
            if proposed:
                actions.append("Wrote ci.proposed.yml")
                actions.append("Added to approval_queue")
                run_type = "ci_scan_with_proposal"

        result = self._build_result(run_type, severity, findings, actions)

        self._save_run(result)
        if severity >= 80:
            self._escalate(result)

        logger.info(
            "RHODEY_CI_SCAN severity=%d findings=%d actions=%d scan_only=%s",
            severity, len(findings), len(actions), scan_only,
        )
        return result

    def report(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Return the latest N runs for RHODEY."""
        with Session(engine) as session:
            runs = session.exec(
                select(AgentRun)
                .where(AgentRun.agent == self.AGENT)
                .order_by(AgentRun.created_at.desc())
                .limit(limit)
            ).all()
            return [self._run_to_dict(r) for r in runs]

    # ----- workflow scanning -----

    def _scan_workflows(self) -> List[Dict[str, Any]]:
        """Audit .github/workflows/ for CI gaps."""
        findings = []

        if not _WORKFLOWS_DIR.exists():
            findings.append({
                "check": "no_workflows_dir",
                "severity": 90,
                "message": "No .github/workflows/ directory — CI is completely missing",
            })
            return findings

        yml_files = list(_WORKFLOWS_DIR.glob("*.yml")) + list(_WORKFLOWS_DIR.glob("*.yaml"))
        # Exclude proposed files from the scan
        yml_files = [f for f in yml_files if "proposed" not in f.name]

        if not yml_files:
            findings.append({
                "check": "no_workflow_files",
                "severity": 90,
                "message": "No workflow YAML files found — CI is completely missing",
            })
            return findings

        # Read all workflow content
        all_content = ""
        for f in yml_files:
            try:
                all_content += f.read_text()
            except OSError:
                pass

        # Check for pytest
        has_pytest = "pytest" in all_content
        if not has_pytest:
            findings.append({
                "check": "no_pytest_in_ci",
                "severity": 70,
                "message": "No pytest step found in any CI workflow — backend tests not running in CI",
            })
        else:
            findings.append({
                "check": "pytest_present",
                "severity": 0,
                "message": "pytest found in CI workflow",
            })

        # Check for coverage
        has_coverage = "--cov" in all_content or "coverage" in all_content
        if not has_coverage:
            findings.append({
                "check": "no_coverage_in_ci",
                "severity": 30,
                "message": "No coverage reporting configured in CI",
            })

        # Check for ESLint / npm run lint
        has_eslint = "eslint" in all_content or "npm run lint" in all_content
        if not has_eslint:
            findings.append({
                "check": "no_eslint_in_ci",
                "severity": 50,
                "message": "No ESLint / lint step found in CI — frontend linting not enforced",
            })
        else:
            findings.append({
                "check": "eslint_present",
                "severity": 0,
                "message": "ESLint / lint step found in CI",
            })

        # Check for TypeScript check
        has_tsc = "tsc --noEmit" in all_content or "tsc" in all_content
        if not has_tsc:
            findings.append({
                "check": "no_tsc_in_ci",
                "severity": 50,
                "message": "No TypeScript check found in CI",
            })

        # Check for dependency caching
        has_pip_cache = "pip" in all_content and "cache" in all_content
        has_npm_cache = "npm" in all_content and "cache" in all_content
        if not has_pip_cache:
            findings.append({
                "check": "no_pip_cache",
                "severity": 20,
                "message": "No pip dependency caching — CI runs slower than needed",
            })
        if not has_npm_cache:
            findings.append({
                "check": "no_npm_cache",
                "severity": 20,
                "message": "No npm dependency caching — CI runs slower than needed",
            })

        # Check for hardcoded secrets in workflow files
        secret_patterns = [
            re.compile(r"['\"][A-Za-z0-9]{32,}['\"]"),
            re.compile(r"GOCSPX-"),
            re.compile(r"gsk_"),
            re.compile(r"AIzaSy"),
            re.compile(r"re_[A-Za-z0-9]{16,}"),
        ]
        for f in yml_files:
            try:
                content = f.read_text()
                for pat in secret_patterns:
                    if pat.search(content):
                        findings.append({
                            "check": "hardcoded_secret_in_ci",
                            "severity": 95,
                            "file": str(f.relative_to(_PROJECT_ROOT)),
                            "message": f"Possible hardcoded secret in {f.name}",
                        })
                        break
            except OSError:
                pass

        # Check for correct branch targeting
        has_main_trigger = "branches:" in all_content and "main" in all_content
        if not has_main_trigger:
            findings.append({
                "check": "no_main_branch_trigger",
                "severity": 40,
                "message": "No CI trigger targeting main branch",
            })

        # Check Python version
        has_python_311 = "3.11" in all_content
        if not has_python_311:
            findings.append({
                "check": "wrong_python_version",
                "severity": 20,
                "message": "CI does not specify Python 3.11",
            })

        return findings

    # ----- code quality scanning -----

    def _scan_print_statements(self) -> List[Dict[str, Any]]:
        """Scan backend/**/*.py for print() statements (should use logger)."""
        findings = []
        violations: List[Dict[str, Any]] = []
        backend_app = _BACKEND_ROOT / "app"

        if not backend_app.exists():
            return findings

        for py_file in backend_app.rglob("*.py"):
            # Skip excluded dirs and files
            if any(part in _PRINT_EXCLUDE_DIRS for part in py_file.parts):
                continue
            if py_file.name in _PRINT_EXCLUDE_FILES:
                continue

            try:
                lines = py_file.read_text().splitlines()
            except OSError:
                continue

            file_violations = []
            for i, line in enumerate(lines, 1):
                stripped = line.strip()
                # Skip comments
                if stripped.startswith("#"):
                    continue
                if re.match(r"^\s*print\(", line):
                    file_violations.append({
                        "file": str(py_file.relative_to(_PROJECT_ROOT)),
                        "line": i,
                        "code": stripped[:80],
                    })

            if file_violations:
                violations.extend(file_violations)

        if violations:
            # Group by file for summary
            files_affected = {v["file"] for v in violations}
            severity = min(40 * len(files_affected), 70)
            findings.append({
                "check": "print_statements",
                "severity": severity,
                "count": len(violations),
                "files_affected": len(files_affected),
                "violations": violations,
                "message": (
                    f"{len(violations)} print() statement(s) across "
                    f"{len(files_affected)} file(s) — should use logger"
                ),
            })
        else:
            findings.append({
                "check": "print_statements_clean",
                "severity": 0,
                "message": "No print() statements found — all logging via logger",
            })

        return findings

    def _scan_console_logs(self) -> List[Dict[str, Any]]:
        """Scan frontend src/ and app/ for console.log() in production code."""
        findings = []
        violations: List[Dict[str, Any]] = []
        frontend_root = _PROJECT_ROOT / "frontend"

        scan_dirs = [frontend_root / "src", frontend_root / "app"]
        exclude_files = {"logger.ts", "logger.js"}  # intentional logger wrappers

        for scan_dir in scan_dirs:
            if not scan_dir.exists():
                continue
            for tsx_file in scan_dir.rglob("*.tsx"):
                if tsx_file.name in exclude_files:
                    continue
                self._check_file_for_pattern(
                    tsx_file, r"console\.log\(", violations, "console_log",
                )
            for ts_file in scan_dir.rglob("*.ts"):
                if ts_file.name in exclude_files:
                    continue
                self._check_file_for_pattern(
                    ts_file, r"console\.log\(", violations, "console_log",
                )

        if violations:
            files_affected = {v["file"] for v in violations}
            severity = min(20 * len(files_affected), 50)
            findings.append({
                "check": "console_log_statements",
                "severity": severity,
                "count": len(violations),
                "files_affected": len(files_affected),
                "violations": violations,
                "message": (
                    f"{len(violations)} console.log() statement(s) across "
                    f"{len(files_affected)} file(s) in production code"
                ),
            })
        else:
            findings.append({
                "check": "console_log_clean",
                "severity": 0,
                "message": "No console.log() found in production frontend code",
            })

        return findings

    def _scan_hardcoded_urls(self) -> List[Dict[str, Any]]:
        """Scan frontend for hardcoded localhost URLs outside env-var fallbacks."""
        findings = []
        violations: List[Dict[str, Any]] = []
        frontend_root = _PROJECT_ROOT / "frontend"

        scan_dirs = [frontend_root / "src", frontend_root / "app"]

        for scan_dir in scan_dirs:
            if not scan_dir.exists():
                continue
            for f in scan_dir.rglob("*.tsx"):
                self._check_hardcoded_urls_in_file(f, violations)
            for f in scan_dir.rglob("*.ts"):
                self._check_hardcoded_urls_in_file(f, violations)

        if violations:
            severity = min(40 * len(violations), 70)
            findings.append({
                "check": "hardcoded_urls",
                "severity": severity,
                "count": len(violations),
                "violations": violations,
                "message": (
                    f"{len(violations)} hardcoded localhost URL(s) found "
                    "without env-var fallback pattern"
                ),
            })
        else:
            findings.append({
                "check": "hardcoded_urls_clean",
                "severity": 0,
                "message": "No bare hardcoded localhost URLs — all use env-var fallback",
            })

        return findings

    def _check_hardcoded_urls_in_file(
        self, filepath: Path, violations: List[Dict[str, Any]]
    ) -> None:
        """Check a single file for hardcoded localhost URLs."""
        if any(part in _URL_EXCLUDE_DIRS for part in filepath.parts):
            return
        if filepath.name in _URL_EXCLUDE_FILES:
            return

        try:
            lines = filepath.read_text().splitlines()
        except OSError:
            return

        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            # Skip comments
            if stripped.startswith("//") or stripped.startswith("*"):
                continue
            # Must contain localhost or 127.0.0.1
            if "localhost" not in line and "127.0.0.1" not in line:
                continue
            # Skip if it's an env-var fallback pattern (process.env.X || 'http://localhost')
            if _ENV_FALLBACK_RE.search(line):
                continue
            # This is a bare hardcoded URL
            violations.append({
                "file": str(filepath.relative_to(_PROJECT_ROOT)),
                "line": i,
                "code": stripped[:100],
            })

    # ----- activation detector -----

    def _detect_activation(self) -> Optional[Dict[str, Any]]:
        """Check if the CI pipeline now covers all gaps (pytest + eslint)."""
        ci_yml = _WORKFLOWS_DIR / "ci.yml"

        if not ci_yml.exists():
            return None

        try:
            content = ci_yml.read_text()
        except OSError:
            return None

        has_pytest = "pytest" in content
        has_lint = "eslint" in content or "npm run lint" in content
        has_cache = "cache" in content

        if has_pytest and has_lint and has_cache:
            # All major gaps resolved — mark any pending proposals as implemented
            with Session(engine) as session:
                pending = session.exec(
                    select(ApprovalQueue).where(
                        ApprovalQueue.agent == self.AGENT,
                        ApprovalQueue.action_type == "propose_ci_pipeline",
                        ApprovalQueue.status == "pending",
                    )
                ).all()
                for item in pending:
                    item.status = "implemented"
                    item.reviewed_at = datetime.now(timezone.utc)
                if pending:
                    session.commit()

            logger.info("RHODEY_ACTIVATION_DETECTED gaps_resolved=True")
            return {
                "check": "ci_activated",
                "severity": 0,
                "message": "CI pipeline covers pytest + eslint + caching — RHODEY standing down",
            }

        return None

    # ----- proposal writer -----

    def _write_proposed_pipeline(
        self, severity: int, findings: List[Dict[str, Any]]
    ) -> bool:
        """Write the gold-standard CI workflow to ci.proposed.yml."""
        gap_count = len([f for f in findings if f.get("severity", 0) > 0])
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

        header = (
            f"# PROPOSED BY RHODEY (War Machine) — CI Guardian\n"
            f"# Generated: {timestamp}\n"
            f"# Severity score: {severity}\n"
            f"# Gaps found: {gap_count}\n"
            f"#\n"
            f"# TO ACTIVATE:\n"
            f"# 1. Review this file carefully\n"
            f"# 2. Rename to ci.yml: mv ci.proposed.yml ci.yml\n"
            f"# 3. git add .github/workflows/ci.yml\n"
            f'# 4. git commit -m "ci: upgrade GitHub Actions pipeline (RHODEY)"\n'
            f"# 5. git push\n"
            f"#\n"
            f"# RHODEY will detect activation on next run\n"
            f"# and mark this proposal as implemented.\n"
        )

        yaml_content = header + "\n" + _GOLD_STANDARD_CI_YAML

        try:
            _WORKFLOWS_DIR.mkdir(parents=True, exist_ok=True)
            _PROPOSED_FILE.write_text(yaml_content)
            logger.info("RHODEY wrote proposed pipeline to %s", _PROPOSED_FILE)
        except OSError as exc:
            logger.error("RHODEY failed to write proposed pipeline: %s", exc)
            return False

        # Write to approval queue
        with Session(engine) as session:
            # Collect violation summaries for the queue entry
            print_findings = [f for f in findings if f.get("check") == "print_statements"]
            console_findings = [f for f in findings if f.get("check") == "console_log_statements"]
            url_findings = [f for f in findings if f.get("check") == "hardcoded_urls"]

            record = ApprovalQueue(
                agent=self.AGENT,
                department=self.DEPARTMENT,
                action_type="propose_ci_pipeline",
                action_data={
                    "proposed_file": ".github/workflows/ci.proposed.yml",
                    "gaps_found": [
                        f for f in findings
                        if f.get("severity", 0) > 0
                        and f.get("check") not in (
                            "print_statements", "console_log_statements",
                            "hardcoded_urls",
                        )
                    ],
                    "print_violations_count": (
                        print_findings[0]["count"] if print_findings else 0
                    ),
                    "console_log_violations_count": (
                        console_findings[0]["count"] if console_findings else 0
                    ),
                    "hardcoded_url_violations_count": (
                        url_findings[0]["count"] if url_findings else 0
                    ),
                },
                severity=severity,
                reason=(
                    f"RHODEY found {gap_count} CI gap(s). "
                    f"Proposed fix written to .github/workflows/ci.proposed.yml"
                ),
            )
            session.add(record)
            session.commit()

        return True

    # ----- helpers (match NATASHA exactly) -----

    @staticmethod
    def _check_file_for_pattern(
        filepath: Path,
        pattern: str,
        violations: List[Dict[str, Any]],
        violation_type: str,
    ) -> None:
        """Scan a single file for lines matching a regex pattern."""
        try:
            lines = filepath.read_text().splitlines()
        except OSError:
            return

        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith("//") or stripped.startswith("#"):
                continue
            if re.search(pattern, line):
                violations.append({
                    "type": violation_type,
                    "file": str(filepath.relative_to(_PROJECT_ROOT)),
                    "line": i,
                    "code": stripped[:80],
                })

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
            f"[{level}] ci_scan: {len(findings)} finding(s), "
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


# ---------------------------------------------------------------------------
# Gold-standard CI YAML — deterministic, no LLM needed
# ---------------------------------------------------------------------------

_GOLD_STANDARD_CI_YAML = """\
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: "pip"
          cache-dependency-path: backend/requirements.txt

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Syntax check
        run: python -c "
          import ast, pathlib;
          [ast.parse(f.read_text()) for f in pathlib.Path('app').rglob('*.py')];
          print('Syntax OK')
          "

      - name: Import check
        env:
          FOOTBALL_API_KEY: "test"
          DATABASE_URL: ""
          SECRET_KEY: "test-secret"
        run: python -c "from app.main import app; print('Imports OK')"

      - name: Run tests
        env:
          FOOTBALL_API_KEY: "test"
          DATABASE_URL: ""
          SECRET_KEY: "test-secret"
        run: pytest tests/ -v --tb=short

  frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build
"""
