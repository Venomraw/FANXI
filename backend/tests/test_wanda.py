"""
WANDA agent tests — typography scanning and design health score calculation.

All tests use the in-memory SQLite database from conftest.py fixtures.
"""
import tempfile
from pathlib import Path

from app.agents.wanda import Wanda


# ---------------------------------------------------------------------------
# Test 1: Typography + Accessibility scan on a mock TSX file
# ---------------------------------------------------------------------------

def test_wanda_typography_scan():
    """
    Given a mock TSX file with known violations (text-[8px], missing alt,
    outline-none without focus:ring), WANDA should detect them correctly.
    """
    mock_tsx = """\
import React from 'react';

export default function BadComponent() {
  return (
    <div>
      <p className="text-[8px] leading-none">Too small text</p>
      <p className="text-[10px]">Also too small</p>
      <img src="/hero.png" />
      <button className="outline-none p-1"><svg /></button>
      <div onClick={() => alert('hi')} className="bg-red-500"></div>
      <span className="text-white/20">Low contrast</span>
      <h1 className="text-6xl">No responsive variant</h1>
      <input placeholder="Name" />
      <div className="text-[#ff00ff]">Hardcoded color</div>
      <div className="z-[999]">Z-index chaos</div>
      <div className="p-[13px]">Off-grid spacing</div>
    </div>
  );
}
"""
    wanda = Wanda()

    # Write mock file to a temp directory that matches scan structure
    with tempfile.TemporaryDirectory() as tmpdir:
        # Override the scan dirs to use our temp dir
        app_dir = Path(tmpdir) / "app"
        app_dir.mkdir()
        mock_file = app_dir / "BadComponent.tsx"
        mock_file.write_text(mock_tsx)

        # Manually scan the file
        # We need to set _PROJECT_ROOT so relative paths work
        import app.agents.wanda as wanda_module
        orig_project_root = wanda_module._PROJECT_ROOT
        wanda_module._PROJECT_ROOT = Path(tmpdir)

        try:
            typo_findings = wanda._scan_typography(mock_file)
            a11y_findings = wanda._scan_accessibility(mock_file)
            ds_findings = wanda._scan_design_system(mock_file)
        finally:
            wanda_module._PROJECT_ROOT = orig_project_root

    # Typography assertions
    typo_checks = [f["check"] for f in typo_findings]
    assert "font_size_too_small" in typo_checks, (
        f"Should detect text-[8px] as too small. Got: {typo_checks}"
    )
    small_font_findings = [f for f in typo_findings if f["check"] == "font_size_too_small"]
    assert len(small_font_findings) >= 2, "Should detect both text-[8px] and text-[10px]"

    assert "text_contrast" in typo_checks, (
        f"Should detect text-white/20 low contrast. Got: {typo_checks}"
    )
    assert "responsive_font_size" in typo_checks, (
        f"Should detect text-6xl without responsive variant. Got: {typo_checks}"
    )

    # Accessibility assertions
    a11y_checks = [f["check"] for f in a11y_findings]
    assert "missing_alt_text" in a11y_checks, (
        f"Should detect <img> without alt. Got: {a11y_checks}"
    )
    assert "missing_focus_styles" in a11y_checks, (
        f"Should detect outline-none without focus:ring. Got: {a11y_checks}"
    )

    # Design system assertions
    ds_checks = [f["check"] for f in ds_findings]
    assert "hardcoded_color" in ds_checks, (
        f"Should detect text-[#ff00ff]. Got: {ds_checks}"
    )
    assert "zindex_chaos" in ds_checks, (
        f"Should detect z-[999]. Got: {ds_checks}"
    )
    assert "spacing_off_grid" in ds_checks, (
        f"Should detect p-[13px] off 4px grid. Got: {ds_checks}"
    )


# ---------------------------------------------------------------------------
# Test 2: Design health score calculation
# ---------------------------------------------------------------------------

def test_wanda_severity_calculation():
    """
    Given n violations of each severity level, assert the design health
    score is calculated correctly using the formula:
    100 - (critical * 10) - (warning * 3) - (info * 1)
    """
    # Case 1: No violations → 100
    assert Wanda.calculate_design_health_score([]) == 100

    # Case 2: 2 critical (sev >= 70), 3 warning (40-69), 5 info (0-39)
    findings = (
        [{"severity": 80}] * 2 +    # 2 critical
        [{"severity": 50}] * 3 +    # 3 warning
        [{"severity": 10}] * 5      # 5 info
    )
    # 100 - (2*10) - (3*3) - (5*1) = 100 - 20 - 9 - 5 = 66
    assert Wanda.calculate_design_health_score(findings) == 66

    # Case 3: Many critical → floor at 0
    findings = [{"severity": 90}] * 15
    # 100 - (15*10) = 100 - 150 = -50 → clamped to 0
    assert Wanda.calculate_design_health_score(findings) == 0

    # Case 4: One of each
    findings = [
        {"severity": 75},   # critical
        {"severity": 45},   # warning
        {"severity": 10},   # info
    ]
    # 100 - (1*10) - (1*3) - (1*1) = 86
    assert Wanda.calculate_design_health_score(findings) == 86

    # Case 5: Only info → small deduction
    findings = [{"severity": 5}] * 10
    # 100 - (0*10) - (0*3) - (10*1) = 90
    assert Wanda.calculate_design_health_score(findings) == 90
