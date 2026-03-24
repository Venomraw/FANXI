"""
WANDA — Scarlet Witch — Stark Design Labs Division

Typography + Accessibility Guardian.  Continuously scans every TSX file
in the frontend for typography violations, accessibility issues, and
readability problems.  Writes prioritised fix proposals to approval_queue
for founder review.

Responsibilities:
  1. typography_scan      — font size, line height, weight, spacing, contrast
  2. accessibility_scan   — alt text, aria labels, form labels, focus, keyboard
  3. design_system_scan   — hardcoded colors, glass cards, spacing, z-index
  4. groq_suggestions     — top 5 findings → Groq for Tailwind fix proposals
  5. competitor_research  — weekly Groq-powered UX pattern analysis

Severity scale (0–100):
  0–39  INFO     — clean, logged for audit trail
  40–69 WARNING  — add to briefing
  70–100 CRITICAL — approval_queue + highlight in admin panel
"""
import json
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

from sqlmodel import Session, select

from app.db import engine
from app.models import AgentRun, ApprovalQueue

logger = logging.getLogger("fanxi.agents.wanda")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
_BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
_PROJECT_ROOT = _BACKEND_ROOT.parent
_FRONTEND_ROOT = _PROJECT_ROOT / "frontend"

# Directories to scan
_SCAN_DIRS = [
    _FRONTEND_ROOT / "app",
    _FRONTEND_ROOT / "src",
]

# Directories to skip
_SKIP_DIRS = {"node_modules", ".next", "dist"}

# Approved font families
_APPROVED_FONTS = {"Space Grotesk", "Syne", "JetBrains Mono"}

# Low-contrast text patterns (likely fail WCAG AA 4.5:1)
_LOW_CONTRAST_PATTERNS = [
    re.compile(r"text-white/20"),
    re.compile(r"text-white/30"),
    re.compile(r"text-white/40"),
    re.compile(r"text-gray-600"),
]

# Small font size pattern: text-[Xpx] where X < 12
_SMALL_FONT_RE = re.compile(r"text-\[(\d+)px\]")

# Heading sizes without responsive variants
_HEADING_SIZES = {"text-5xl", "text-6xl", "text-7xl", "text-8xl", "text-9xl"}
_RESPONSIVE_PREFIXES = {"sm:", "md:", "lg:", "xl:", "2xl:"}

# Off-grid spacing pattern: p-[Xpx] or m-[Xpx] where X not on 4px grid
_OFFGRID_SPACING_RE = re.compile(r"[pm][xytblr]?-\[(\d+)px\]")

# Hardcoded hex in className
_HARDCODED_HEX_CLASS_RE = re.compile(r"(?:text|bg|border)-\[#[0-9a-fA-F]{3,8}\]")

# Hardcoded hex in style prop
_HARDCODED_HEX_STYLE_RE = re.compile(r"style=\{\{[^}]*(?:color|background|border)[^}]*['\"]#[0-9a-fA-F]{3,8}['\"]")

# Z-index chaos
_ZINDEX_CHAOS_RE = re.compile(r"(?:z-\[\d{3,}\]|zIndex:\s*\d{3,})")

# onClick on non-interactive elements
_ONCLICK_DIV_RE = re.compile(r"<(?:div|span|p)\s[^>]*onClick")

# Image without alt
_IMG_NO_ALT_RE = re.compile(r"<(?:img|Image)\s(?:(?!alt[ =])[^>])*>")

# Button with no text content (icon-only without aria-label)
_BUTTON_NO_LABEL_RE = re.compile(r"<button\s(?:(?!aria-label)[^>])*>(?:\s*<[^/])")

# Input without label/aria-label
_INPUT_NO_LABEL_RE = re.compile(r"<input\s(?:(?!aria-label)[^>])*(?:placeholder)")

# outline-none without focus:ring replacement
_OUTLINE_NONE_RE = re.compile(r"(?:outline-none|focus:outline-none)")
_FOCUS_RING_RE = re.compile(r"focus:ring")

# Small touch targets
_SMALL_TOUCH_RE = re.compile(r"(?:p-0\.5|p-1|w-4\s+h-4|w-3\s+h-3)")

# Color-only indicators (bg-red/green/yellow on elements)
_COLOR_ONLY_RE = re.compile(r"(?:bg-red|bg-green|bg-yellow)-\d+")

# Unapproved font-family in inline styles
_INLINE_FONT_RE = re.compile(r"font-family:\s*['\"]?([^;'\"]+)")


class Wanda:
    """Scarlet Witch — Typography + Accessibility Guardian."""

    AGENT = "WANDA"
    DEPARTMENT = "stark_design_labs"

    # ----- public interface -----

    def run_typography_scan(self) -> Dict[str, Any]:
        """Scan all TSX files for typography violations."""
        findings: List[Dict[str, Any]] = []
        actions: List[str] = []

        tsx_files = self._collect_tsx_files()
        for fpath in tsx_files:
            findings.extend(self._scan_typography(fpath))

        # Check global font smoothing
        findings.extend(self._check_font_smoothing())

        severity = self._max_severity(findings)
        result = self._build_result("typography_scan", severity, findings, actions)
        self._save_run(result)

        if severity >= 70:
            self._escalate(result)
        elif len([f for f in findings if f.get("category") == "typography"]) >= 5:
            self._escalate(result)

        logger.info(
            "WANDA_TYPOGRAPHY_SCAN severity=%d findings=%d",
            severity, len(findings),
        )
        return result

    def run_accessibility_scan(self) -> Dict[str, Any]:
        """Scan all TSX files for accessibility violations."""
        findings: List[Dict[str, Any]] = []
        actions: List[str] = []

        tsx_files = self._collect_tsx_files()
        for fpath in tsx_files:
            findings.extend(self._scan_accessibility(fpath))

        severity = self._max_severity(findings)
        result = self._build_result("accessibility_scan", severity, findings, actions)
        self._save_run(result)

        # Escalate any accessibility violation >= 50
        critical = [f for f in findings if f.get("severity", 0) >= 50]
        if critical:
            self._escalate(result)

        logger.info(
            "WANDA_ACCESSIBILITY_SCAN severity=%d findings=%d",
            severity, len(findings),
        )
        return result

    def run_design_system_scan(self) -> Dict[str, Any]:
        """Scan all TSX files for design system violations."""
        findings: List[Dict[str, Any]] = []
        actions: List[str] = []

        tsx_files = self._collect_tsx_files()
        for fpath in tsx_files:
            findings.extend(self._scan_design_system(fpath))

        severity = self._max_severity(findings)
        result = self._build_result("design_system_scan", severity, findings, actions)
        self._save_run(result)

        if len(findings) >= 10:
            self._escalate(result)

        logger.info(
            "WANDA_DESIGN_SYSTEM_SCAN severity=%d findings=%d",
            severity, len(findings),
        )
        return result

    def run_groq_suggestions(self) -> Dict[str, Any]:
        """Run full scan then send top 5 findings to Groq for fix suggestions."""
        findings: List[Dict[str, Any]] = []
        actions: List[str] = []

        # Gather all findings
        tsx_files = self._collect_tsx_files()
        for fpath in tsx_files:
            findings.extend(self._scan_typography(fpath))
            findings.extend(self._scan_accessibility(fpath))
            findings.extend(self._scan_design_system(fpath))
        findings.extend(self._check_font_smoothing())

        # Sort by severity descending, take top 5
        top_5 = sorted(findings, key=lambda f: f.get("severity", 0), reverse=True)[:5]

        suggestions = []
        for finding in top_5:
            suggestion = self._call_groq_fix_suggestion(finding)
            if suggestion:
                suggestions.append(suggestion)
                actions.append(
                    f"Groq suggestion for {finding.get('check', 'unknown')}: "
                    f"{suggestion.get('fix', 'N/A')}"
                )

        # Add suggestions to approval queue
        self._queue_suggestions(suggestions)

        severity = self._max_severity(findings)
        all_findings = {
            "design_health_score": self.calculate_design_health_score(findings),
            "total_violations": len(findings),
            "typography_violations": [f for f in findings if f.get("category") == "typography"],
            "accessibility_violations": [f for f in findings if f.get("category") == "accessibility"],
            "design_system_violations": [f for f in findings if f.get("category") == "design_system"],
            "top_5_fixes": suggestions,
        }

        result = self._build_result(
            "groq_suggestions", severity,
            [{"check": "groq_summary", "severity": severity, **all_findings}],
            actions,
        )
        self._save_run(result)

        logger.info(
            "WANDA_GROQ_SUGGESTIONS severity=%d suggestions=%d",
            severity, len(suggestions),
        )
        return result

    def run_competitor_research(self) -> Dict[str, Any]:
        """Weekly competitor UX research via Groq."""
        findings: List[Dict[str, Any]] = []
        actions: List[str] = []

        insights = self._call_groq_competitor_research()
        if insights:
            findings.append({
                "check": "competitor_research",
                "severity": 10,
                "category": "research",
                "insights": insights,
                "message": f"Generated {len(insights)} competitor insights",
            })
            actions.append(f"Generated {len(insights)} competitor insights")

            # Add top 3 to approval queue
            top_3 = insights[:3]
            self._queue_competitor_insights(top_3)
        else:
            findings.append({
                "check": "competitor_research_failed",
                "severity": 20,
                "category": "research",
                "message": "Groq competitor research returned no insights",
            })

        severity = self._max_severity(findings)
        result = self._build_result("competitor_research", severity, findings, actions)
        self._save_run(result)

        logger.info(
            "WANDA_COMPETITOR_RESEARCH severity=%d insights=%d",
            severity, len(insights) if insights else 0,
        )
        return result

    def run_full_scan(self) -> Dict[str, Any]:
        """Run all scans and Groq suggestions.  Returns combined output."""
        findings: List[Dict[str, Any]] = []
        actions: List[str] = []

        tsx_files = self._collect_tsx_files()
        for fpath in tsx_files:
            findings.extend(self._scan_typography(fpath))
            findings.extend(self._scan_accessibility(fpath))
            findings.extend(self._scan_design_system(fpath))
        findings.extend(self._check_font_smoothing())

        # Top 5 → Groq
        top_5 = sorted(findings, key=lambda f: f.get("severity", 0), reverse=True)[:5]
        suggestions = []
        for finding in top_5:
            suggestion = self._call_groq_fix_suggestion(finding)
            if suggestion:
                suggestions.append(suggestion)
                actions.append(
                    f"Groq fix: {suggestion.get('fix', 'N/A')}"
                )

        self._queue_suggestions(suggestions)

        design_health = self.calculate_design_health_score(findings)
        severity = self._max_severity(findings)

        typo_violations = [f for f in findings if f.get("category") == "typography"]
        a11y_violations = [f for f in findings if f.get("category") == "accessibility"]
        ds_violations = [f for f in findings if f.get("category") == "design_system"]

        full_findings = {
            "design_health_score": design_health,
            "total_violations": len(findings),
            "typography_violations": typo_violations,
            "accessibility_violations": a11y_violations,
            "design_system_violations": ds_violations,
            "top_5_fixes": suggestions,
        }

        # Escalation rules
        escalate = False
        if any(f.get("severity", 0) >= 50 for f in a11y_violations):
            escalate = True
        if len(typo_violations) >= 5:
            escalate = True
        if len(ds_violations) >= 10:
            escalate = True

        result_findings = [{"check": "full_scan_summary", "severity": severity, **full_findings}]

        result = self._build_result("full_scan", severity, result_findings, actions)
        result["findings"] = result_findings
        self._save_run(result)

        if escalate:
            self._escalate(result)

        logger.info(
            "WANDA_FULL_SCAN severity=%d total=%d health=%d",
            severity, len(findings), design_health,
        )
        return result

    def get_latest_violations(self) -> Dict[str, Any]:
        """Return latest scan results grouped by violation type + severity."""
        with Session(engine) as session:
            run = session.exec(
                select(AgentRun)
                .where(AgentRun.agent == self.AGENT)
                .order_by(AgentRun.created_at.desc())
                .limit(1)
            ).first()

            if not run:
                return {"message": "No WANDA runs found"}

            return {
                "agent": self.AGENT,
                "run_type": run.run_type,
                "severity": run.severity,
                "findings": run.findings,
                "summary": run.summary,
                "created_at": run.created_at.isoformat() if run.created_at else None,
            }

    def report(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Return the latest N runs for WANDA."""
        with Session(engine) as session:
            runs = session.exec(
                select(AgentRun)
                .where(AgentRun.agent == self.AGENT)
                .order_by(AgentRun.created_at.desc())
                .limit(limit)
            ).all()
            return [self._run_to_dict(r) for r in runs]

    # ----- design health score -----

    @staticmethod
    def calculate_design_health_score(findings: List[Dict[str, Any]]) -> int:
        """
        100 - (critical * 10) - (warning * 3) - (info * 1)
        Clamped to [0, 100].
        """
        critical = 0
        warning = 0
        info = 0
        for f in findings:
            sev = f.get("severity", 0)
            if sev >= 70:
                critical += 1
            elif sev >= 40:
                warning += 1
            else:
                info += 1

        score = 100 - (critical * 10) - (warning * 3) - (info * 1)
        return max(0, min(100, score))

    # ----- file collection -----

    def _collect_tsx_files(self) -> List[Path]:
        """Collect all .tsx files from scan directories, skipping excluded dirs."""
        tsx_files: List[Path] = []
        for scan_dir in _SCAN_DIRS:
            try:
                if not scan_dir.exists():
                    continue
                for fpath in scan_dir.rglob("*.tsx"):
                    if any(skip in fpath.parts for skip in _SKIP_DIRS):
                        continue
                    if fpath.is_file():
                        tsx_files.append(fpath)
            except OSError as exc:
                logger.warning("WANDA: Error scanning %s: %s", scan_dir, exc)
        return tsx_files

    # ----- responsibility 1: typography scanner -----

    def _scan_typography(self, fpath: Path) -> List[Dict[str, Any]]:
        """Scan a single TSX file for typography violations."""
        findings: List[Dict[str, Any]] = []
        try:
            content = fpath.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError) as exc:
            logger.warning("WANDA: Could not read %s: %s", fpath, exc)
            return findings

        rel_path = str(fpath.relative_to(_PROJECT_ROOT))
        lines = content.splitlines()

        for lineno, line in enumerate(lines, 1):
            # 1. Font size too small
            for match in _SMALL_FONT_RE.finditer(line):
                px = int(match.group(1))
                if px < 12:
                    findings.append({
                        "check": "font_size_too_small",
                        "severity": 30,
                        "category": "typography",
                        "file": rel_path,
                        "line": lineno,
                        "current_code": match.group(0),
                        "message": f"Font size {px}px is below 12px minimum",
                    })

            # 2. Line height too tight on paragraphs
            if ("leading-none" in line or "leading-tight" in line) and "<p" in content:
                if "<h" not in line:
                    tag = "leading-none" if "leading-none" in line else "leading-tight"
                    findings.append({
                        "check": "line_height_too_tight",
                        "severity": 20,
                        "category": "typography",
                        "file": rel_path,
                        "line": lineno,
                        "current_code": tag,
                        "message": f"{tag} on non-heading text",
                    })

            # 3. Unapproved font family in inline styles
            for match in _INLINE_FONT_RE.finditer(line):
                font = match.group(1).strip()
                if not any(approved in font for approved in _APPROVED_FONTS):
                    findings.append({
                        "check": "unapproved_font",
                        "severity": 40,
                        "category": "typography",
                        "file": rel_path,
                        "line": lineno,
                        "current_code": match.group(0),
                        "message": f"Unapproved font family: {font}",
                    })

            # 4. Letter spacing on body text
            if ("tracking-widest" in line or "tracking-wider" in line):
                if "<h" not in line and "label" not in line.lower():
                    tag = "tracking-widest" if "tracking-widest" in line else "tracking-wider"
                    findings.append({
                        "check": "letter_spacing_body",
                        "severity": 15,
                        "category": "typography",
                        "file": rel_path,
                        "line": lineno,
                        "current_code": tag,
                        "message": f"{tag} on body text (fine on headings/labels only)",
                    })

            # 5. Text contrast issues
            for pattern in _LOW_CONTRAST_PATTERNS:
                if pattern.search(line):
                    findings.append({
                        "check": "text_contrast",
                        "severity": 50,
                        "category": "typography",
                        "file": rel_path,
                        "line": lineno,
                        "current_code": pattern.pattern,
                        "message": f"Low contrast text: {pattern.pattern} likely fails WCAG AA",
                    })

            # 7. Responsive font sizes — headings without responsive variant
            for heading_class in _HEADING_SIZES:
                if heading_class in line:
                    has_responsive = any(
                        f"{prefix}{heading_class}" in line or
                        any(f"{prefix}text-" in line for prefix in _RESPONSIVE_PREFIXES)
                        for prefix in _RESPONSIVE_PREFIXES
                    )
                    if not has_responsive:
                        findings.append({
                            "check": "responsive_font_size",
                            "severity": 20,
                            "category": "typography",
                            "file": rel_path,
                            "line": lineno,
                            "current_code": heading_class,
                            "message": f"{heading_class} without responsive size variant",
                        })

        return findings

    def _check_font_smoothing(self) -> List[Dict[str, Any]]:
        """Check if antialiased font smoothing is set globally."""
        findings: List[Dict[str, Any]] = []
        globals_css = _FRONTEND_ROOT / "app" / "globals.css"

        try:
            if not globals_css.exists():
                findings.append({
                    "check": "globals_css_missing",
                    "severity": 25,
                    "category": "typography",
                    "file": "frontend/app/globals.css",
                    "message": "globals.css not found — cannot verify font smoothing",
                })
                return findings

            content = globals_css.read_text(encoding="utf-8")
            if "-webkit-font-smoothing" not in content and "antialiased" not in content:
                findings.append({
                    "check": "missing_font_smoothing",
                    "severity": 25,
                    "category": "typography",
                    "file": "frontend/app/globals.css",
                    "message": "No font smoothing (antialiased) set in globals.css",
                })
        except OSError as exc:
            logger.warning("WANDA: Could not read globals.css: %s", exc)

        return findings

    # ----- responsibility 2: accessibility scanner -----

    def _scan_accessibility(self, fpath: Path) -> List[Dict[str, Any]]:
        """Scan a single TSX file for accessibility violations."""
        findings: List[Dict[str, Any]] = []
        try:
            content = fpath.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError) as exc:
            logger.warning("WANDA: Could not read %s: %s", fpath, exc)
            return findings

        rel_path = str(fpath.relative_to(_PROJECT_ROOT))
        lines = content.splitlines()

        for lineno, line in enumerate(lines, 1):
            # 1. Missing alt text on images
            if re.search(r"<(?:img|Image)\s", line):
                if "alt=" not in line and "alt =" not in line:
                    findings.append({
                        "check": "missing_alt_text",
                        "severity": 60,
                        "category": "accessibility",
                        "file": rel_path,
                        "line": lineno,
                        "current_code": line.strip()[:80],
                        "message": "Image without alt text",
                    })

            # 2. Missing aria labels on buttons
            if "<button" in line and "aria-label" not in line:
                # Check if button has text content (next non-whitespace after >)
                after_tag = line.split("<button")[1] if "<button" in line else ""
                if ">" in after_tag:
                    content_after = after_tag.split(">", 1)[1] if ">" in after_tag else ""
                    # Icon-only button (starts with < suggesting a child component)
                    stripped = content_after.strip()
                    if stripped.startswith("<") or stripped == "" or stripped.startswith("{"):
                        findings.append({
                            "check": "missing_aria_label",
                            "severity": 50,
                            "category": "accessibility",
                            "file": rel_path,
                            "line": lineno,
                            "current_code": line.strip()[:80],
                            "message": "Button without aria-label (icon-only or empty)",
                        })

            # 3. Missing form labels
            if "<input" in line:
                if "aria-label" not in line and "id=" not in line:
                    findings.append({
                        "check": "missing_form_label",
                        "severity": 45,
                        "category": "accessibility",
                        "file": rel_path,
                        "line": lineno,
                        "current_code": line.strip()[:80],
                        "message": "Input without associated label or aria-label",
                    })

            # 4. Color-only indicators
            if _COLOR_ONLY_RE.search(line):
                # Check if element has text content
                stripped = line.strip()
                if "/>" in stripped or "></" in stripped:
                    # Self-closing or empty element — color only
                    tag_content = stripped.split(">")[1].split("<")[0].strip() if ">" in stripped else ""
                    if not tag_content:
                        findings.append({
                            "check": "color_only_indicator",
                            "severity": 35,
                            "category": "accessibility",
                            "file": rel_path,
                            "line": lineno,
                            "current_code": stripped[:80],
                            "message": "Color-only status indicator with no text/icon backup",
                        })

            # 5. Missing focus styles
            if _OUTLINE_NONE_RE.search(line) and not _FOCUS_RING_RE.search(line):
                findings.append({
                    "check": "missing_focus_styles",
                    "severity": 40,
                    "category": "accessibility",
                    "file": rel_path,
                    "line": lineno,
                    "current_code": line.strip()[:80],
                    "message": "outline-none without custom focus:ring replacement",
                })

            # 6. Keyboard navigation — onClick on non-interactive elements
            if _ONCLICK_DIV_RE.search(line):
                if 'role="button"' not in line and "tabIndex" not in line and "onKeyDown" not in line:
                    findings.append({
                        "check": "keyboard_navigation",
                        "severity": 45,
                        "category": "accessibility",
                        "file": rel_path,
                        "line": lineno,
                        "current_code": line.strip()[:80],
                        "message": "onClick on div/span/p without role, tabIndex, or onKeyDown",
                    })

            # 7. Touch target size
            if ("<button" in line or "<a " in line) and _SMALL_TOUCH_RE.search(line):
                findings.append({
                    "check": "touch_target_too_small",
                    "severity": 35,
                    "category": "accessibility",
                    "file": rel_path,
                    "line": lineno,
                    "current_code": line.strip()[:80],
                    "message": "Interactive element likely too small for touch (< 44x44px)",
                })

        return findings

    # ----- responsibility 3: design system audit -----

    def _scan_design_system(self, fpath: Path) -> List[Dict[str, Any]]:
        """Scan a single TSX file for design system violations."""
        findings: List[Dict[str, Any]] = []
        try:
            content = fpath.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError) as exc:
            logger.warning("WANDA: Could not read %s: %s", fpath, exc)
            return findings

        rel_path = str(fpath.relative_to(_PROJECT_ROOT))
        lines = content.splitlines()

        for lineno, line in enumerate(lines, 1):
            # 1. Hardcoded colors
            if _HARDCODED_HEX_CLASS_RE.search(line):
                match = _HARDCODED_HEX_CLASS_RE.search(line)
                findings.append({
                    "check": "hardcoded_color",
                    "severity": 25,
                    "category": "design_system",
                    "file": rel_path,
                    "line": lineno,
                    "current_code": match.group(0) if match else line.strip()[:80],
                    "message": "Hardcoded hex color — use Tailwind tokens or FanXI design system",
                })

            if _HARDCODED_HEX_STYLE_RE.search(line):
                findings.append({
                    "check": "hardcoded_color_style",
                    "severity": 25,
                    "category": "design_system",
                    "file": rel_path,
                    "line": lineno,
                    "current_code": line.strip()[:80],
                    "message": "Hardcoded hex color in style prop",
                })

            # 2. Inconsistent glass cards
            if "backdrop-blur" in line and "bg-" not in line:
                findings.append({
                    "check": "glass_card_no_bg_opacity",
                    "severity": 15,
                    "category": "design_system",
                    "file": rel_path,
                    "line": lineno,
                    "current_code": line.strip()[:80],
                    "message": "backdrop-blur without bg opacity — glass card incomplete",
                })

            if "backdrop-blur" in line and "border" not in line:
                findings.append({
                    "check": "glass_card_no_border",
                    "severity": 15,
                    "category": "design_system",
                    "file": rel_path,
                    "line": lineno,
                    "current_code": line.strip()[:80],
                    "message": "backdrop-blur without border — glass card incomplete",
                })

            # 3. Spacing inconsistency (off 4px grid)
            for match in _OFFGRID_SPACING_RE.finditer(line):
                px = int(match.group(1))
                if px % 4 != 0:
                    findings.append({
                        "check": "spacing_off_grid",
                        "severity": 10,
                        "category": "design_system",
                        "file": rel_path,
                        "line": lineno,
                        "current_code": match.group(0),
                        "message": f"Spacing {px}px is not on the 4px grid",
                    })

            # 4. Z-index chaos
            if _ZINDEX_CHAOS_RE.search(line):
                match = _ZINDEX_CHAOS_RE.search(line)
                findings.append({
                    "check": "zindex_chaos",
                    "severity": 20,
                    "category": "design_system",
                    "file": rel_path,
                    "line": lineno,
                    "current_code": match.group(0) if match else line.strip()[:80],
                    "message": "Hardcoded z-index (3+ digits) — use Tailwind z-* scale",
                })

        return findings

    # ----- responsibility 4: Groq improvement suggester -----

    def _call_groq_fix_suggestion(self, finding: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Send a finding to Groq for a Tailwind fix suggestion."""
        prompt = (
            "You are a senior UI/UX engineer reviewing FanXI — a dark-themed "
            "World Cup 2026 tactical prediction app.\n\n"
            "Design system:\n"
            "- Colors: red=#dc2626, gold=#f59e0b\n"
            "- Fonts: Space Grotesk (display), Syne (body), JetBrains Mono (code/data)\n"
            "- Glass cards: bg-black/40 backdrop-blur-md border border-white/10 rounded-xl\n"
            "- Background: dark stadium image\n\n"
            f"Issue found in {finding.get('file', 'unknown')}:\n"
            f"{finding.get('check', 'unknown')}: {finding.get('message', '')}\n"
            f"Current code: {finding.get('current_code', 'N/A')}\n\n"
            "Provide:\n"
            "1. Exact Tailwind fix (1-2 classes to change)\n"
            "2. Why this matters for the FanXI brand\n"
            "3. Effort: LOW | MEDIUM | HIGH\n"
            "4. Impact: LOW | MEDIUM | HIGH\n\n"
            "Return ONLY valid JSON:\n"
            '{\n'
            '  "fix": "exact class change",\n'
            '  "reason": "why this matters",\n'
            '  "effort": "LOW|MEDIUM|HIGH",\n'
            '  "impact": "LOW|MEDIUM|HIGH",\n'
            '  "priority_score": 0-100\n'
            '}'
        )
        data = self._call_groq(prompt)
        if data:
            data["source_finding"] = finding.get("check", "unknown")
            data["file"] = finding.get("file", "unknown")
        return data

    # ----- responsibility 5: competitor research -----

    def _call_groq_competitor_research(self) -> Optional[List[Dict[str, Any]]]:
        """Research competitor typography + accessibility patterns via Groq."""
        prompt = (
            "You are a UI/UX researcher analyzing typography and accessibility "
            "patterns in premium sports apps.\n\n"
            "Analyze these apps from memory/training:\n"
            "1. FotMob — mobile football scores app\n"
            "2. The Athletic — premium sports journalism\n"
            "3. Fantasy Premier League — fantasy football\n"
            "4. Sofascore — live scores and stats\n"
            "5. OneFootball — football news app\n\n"
            "For each app identify:\n"
            "- Primary font choice and why it works\n"
            "- Font size hierarchy (heading/body/label)\n"
            "- How they handle dark backgrounds\n"
            "- Accessibility features they implement\n"
            "- One typography trick FanXI could steal\n\n"
            "Return as JSON array of insights, each with:\n"
            '{\n'
            '  "app": "FotMob",\n'
            '  "insight": "specific observation",\n'
            '  "apply_to_fanxi": "how to apply this",\n'
            '  "priority": "HIGH|MEDIUM|LOW"\n'
            '}'
        )
        data = self._call_groq(prompt)
        if isinstance(data, list):
            return data
        if isinstance(data, dict) and "insights" in data:
            return data["insights"]
        return None

    def _queue_suggestions(self, suggestions: List[Dict[str, Any]]) -> None:
        """Write Groq fix suggestions to approval_queue."""
        with Session(engine) as session:
            for s in suggestions:
                record = ApprovalQueue(
                    agent=self.AGENT,
                    department=self.DEPARTMENT,
                    action_type="design_fix",
                    action_data=s,
                    severity=s.get("priority_score", 50),
                    reason=s.get("reason", "WANDA design fix suggestion"),
                )
                session.add(record)
            session.commit()

    def _queue_competitor_insights(self, insights: List[Dict[str, Any]]) -> None:
        """Write top competitor insights to approval_queue."""
        with Session(engine) as session:
            for insight in insights:
                record = ApprovalQueue(
                    agent=self.AGENT,
                    department=self.DEPARTMENT,
                    action_type="design_research",
                    action_data=insight,
                    severity=20,
                    reason=f"Competitor insight from {insight.get('app', 'unknown')}",
                )
                session.add(record)
            session.commit()

    # ----- shared Groq caller (matches VISION pattern) -----

    def _call_groq(self, prompt: str, retries: int = 1) -> Optional[Any]:
        """Call Groq with a prompt expecting JSON response.  Retries once on parse failure."""
        try:
            from groq import Groq
            from app.config import settings

            if not settings.groq_api_key:
                logger.warning("WANDA: No GROQ_API_KEY set — skipping")
                return None

            client = Groq(api_key=settings.groq_api_key)
        except Exception as exc:
            logger.warning("WANDA: Groq client init failed: %s", exc)
            return None

        for attempt in range(1 + retries):
            try:
                result = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": "You are a UI/UX expert. Return only valid JSON."},
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.7,
                    max_tokens=800,
                )
                raw = result.choices[0].message.content.strip()
                # Strip markdown fences
                if raw.startswith("```"):
                    raw = re.sub(r"^```(?:json)?\s*", "", raw)
                    raw = re.sub(r"\s*```$", "", raw)
                return json.loads(raw)
            except json.JSONDecodeError:
                if attempt < retries:
                    logger.warning("WANDA: Groq JSON parse failed, retrying (attempt %d)", attempt + 1)
                    continue
                logger.warning("WANDA: Groq JSON parse failed after %d attempts", attempt + 1)
                return None
            except Exception as exc:
                logger.warning("WANDA: Groq call failed: %s", exc)
                return None

        return None

    # ----- helpers (match NATASHA/VISION exactly) -----

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
        escalated = severity >= 70
        if severity == 0:
            level = "ALL_CLEAR"
        elif severity < 40:
            level = "INFO"
        elif severity < 70:
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
        critical = [f for f in result["findings"] if f.get("severity", 0) >= 50]
        with Session(engine) as session:
            for finding in critical:
                record = ApprovalQueue(
                    agent=self.AGENT,
                    department=self.DEPARTMENT,
                    action_type="review_finding",
                    action_data=finding,
                    severity=finding.get("severity", 50),
                    reason=finding.get("message", "Design/accessibility finding requires review"),
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
