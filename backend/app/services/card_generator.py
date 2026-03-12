"""
FanXI Card Generator — Pillow-based share card generation.

Generates 1200×630 PNG cards:
  - Prediction card: per-user tactical XI for a given match
  - Profile card:    public scout profile summary

Design choices:
  - Colored team bands instead of emoji flags (PIL can't render emoji)
  - Landscape top-down pitch view (standard tactics board orientation)
  - /tmp/ cache to avoid Render cold-start regeneration on repeated clicks
"""

from __future__ import annotations

import io
import os
import time
from typing import Any, Optional

from PIL import Image, ImageDraw, ImageFont

# ─── Dimensions ───────────────────────────────────────────────────────────────

W, H = 1200, 630

CACHE_TTL_PRED = 600   # 10 min — short enough to reflect prediction updates
CACHE_TTL_PROF = 3600  # 60 min — profiles change rarely

# ─── Colours ──────────────────────────────────────────────────────────────────

BG_TOP   = (10, 10, 10)
BG_BOT   = (18, 18, 46)
RED      = (220, 38, 38)
GOLD     = (245, 158, 11)
WHITE    = (255, 255, 255)
MUTED    = (156, 163, 175)
PITCH_GR = (22, 101, 52)
DARK_BAR = (6, 6, 6)

# Team primary colours — used for the match band rectangles
TEAM_COLORS: dict[str, tuple[int, int, int]] = {
    "France":       (0,   35,  149),
    "Brazil":       (0,   155,  58),
    "Argentina":    (116, 172, 223),
    "Germany":      (30,  30,   30),
    "England":      (180,  12,  40),
    "Spain":        (200,  16,  46),
    "Portugal":     (0,   100,  40),
    "Netherlands":  (230,  90,   0),
    "Belgium":      (160,   0,   0),
    "Italy":        (0,   110, 180),
    "Croatia":      (210,   0,   0),
    "Uruguay":      (0,    40, 100),
    "Mexico":       (0,   130,  50),
    "USA":          (0,    33,  71),
    "Canada":       (200,  20,  20),
    "Japan":        (0,    60, 140),
    "South Korea":  (0,     0, 120),
    "Morocco":      (180,  10,  36),
    "Senegal":      (0,   140,   0),
    "Australia":    (0,    50, 160),
    "Colombia":     (200, 170,   0),
    "Ecuador":      (200, 160,   0),
    "Chile":        (180,  10,  36),
    "Peru":         (180,  10,  36),
    "Switzerland":  (180,  10,  36),
    "Denmark":      (180,  10,  36),
    "Poland":       (180,  10,  36),
    "Serbia":       (180,  10,  36),
    "Ukraine":      (0,    80, 170),
    "Austria":      (180,  10,  36),
    "Turkey":       (180,  10,  36),
    "Iran":         (0,   140,  60),
    "Saudi Arabia": (0,   150,  70),
    "Nigeria":      (0,   140,  60),
    "Ghana":        (30,   30,  30),
    "Cameroon":     (0,   140,  60),
    "Panama":       (180,  10,  36),
    "Costa Rica":   (0,    80, 180),
    "Jamaica":      (0,   120,   0),
    "Bolivia":      (0,    60, 180),
    "Paraguay":     (180,  10,  36),
    "Venezuela":    (180,  10,  36),
}

_DEFAULT_HOME = (40, 40, 80)
_DEFAULT_AWAY = (80, 40, 40)


def _team_color(name: str) -> tuple[int, int, int]:
    return TEAM_COLORS.get(name, (50, 50, 80))


# ─── Formation positions ───────────────────────────────────────────────────────
# Landscape top-down pitch.  x ∈ [0,1]: 0=GK side, 1=FWD side.  y ∈ [0,1]: 0=top, 1=bottom.

FORMATION_POSITIONS: dict[str, list[tuple[float, float]]] = {
    "4-3-3": [
        (0.06, 0.50),                                                  # GK
        (0.24, 0.12), (0.24, 0.38), (0.24, 0.62), (0.24, 0.88),      # DEF
        (0.54, 0.25), (0.54, 0.50), (0.54, 0.75),                     # MID
        (0.82, 0.12), (0.82, 0.50), (0.82, 0.88),                     # FWD
    ],
    "4-4-2": [
        (0.06, 0.50),
        (0.24, 0.12), (0.24, 0.38), (0.24, 0.62), (0.24, 0.88),
        (0.52, 0.12), (0.52, 0.38), (0.52, 0.62), (0.52, 0.88),
        (0.82, 0.33), (0.82, 0.67),
    ],
    "4-2-3-1": [
        (0.06, 0.50),
        (0.24, 0.12), (0.24, 0.38), (0.24, 0.62), (0.24, 0.88),
        (0.44, 0.33), (0.44, 0.67),
        (0.65, 0.15), (0.65, 0.50), (0.65, 0.85),
        (0.85, 0.50),
    ],
    "3-5-2": [
        (0.06, 0.50),
        (0.24, 0.22), (0.24, 0.50), (0.24, 0.78),
        (0.48, 0.08), (0.48, 0.30), (0.48, 0.50), (0.48, 0.70), (0.48, 0.92),
        (0.82, 0.33), (0.82, 0.67),
    ],
    "3-4-3": [
        (0.06, 0.50),
        (0.24, 0.22), (0.24, 0.50), (0.24, 0.78),
        (0.50, 0.12), (0.50, 0.38), (0.50, 0.62), (0.50, 0.88),
        (0.80, 0.15), (0.80, 0.50), (0.80, 0.85),
    ],
    "5-3-2": [
        (0.06, 0.50),
        (0.22, 0.08), (0.22, 0.28), (0.22, 0.50), (0.22, 0.72), (0.22, 0.92),
        (0.52, 0.25), (0.52, 0.50), (0.52, 0.75),
        (0.82, 0.33), (0.82, 0.67),
    ],
    "4-1-4-1": [
        (0.06, 0.50),
        (0.22, 0.12), (0.22, 0.38), (0.22, 0.62), (0.22, 0.88),
        (0.42, 0.50),
        (0.62, 0.10), (0.62, 0.35), (0.62, 0.65), (0.62, 0.90),
        (0.85, 0.50),
    ],
}

_FALLBACK_FORMATION = "4-3-3"


# ─── Font loader ──────────────────────────────────────────────────────────────

def _font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    """Try common Linux + macOS font paths, fall back to PIL default."""
    name = "Bold" if bold else "Regular"
    candidates = [
        f"/usr/share/fonts/truetype/dejavu/DejaVuSans{'-Bold' if bold else ''}.ttf",
        f"/usr/share/fonts/truetype/liberation/LiberationSans-{name}.ttf",
        f"/usr/share/fonts/truetype/freefont/FreeSans{'Bold' if bold else ''}.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/System/Library/Fonts/Arial.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


# ─── Gradient background ──────────────────────────────────────────────────────

def _draw_bg(draw: ImageDraw.ImageDraw) -> None:
    for y in range(H):
        t = y / H
        r = int(BG_TOP[0] + t * (BG_BOT[0] - BG_TOP[0]))
        g = int(BG_TOP[1] + t * (BG_BOT[1] - BG_TOP[1]))
        b = int(BG_TOP[2] + t * (BG_BOT[2] - BG_TOP[2]))
        draw.line([(0, y), (W, y)], fill=(r, g, b))


# ─── Top bar ──────────────────────────────────────────────────────────────────

def _draw_top_bar(draw: ImageDraw.ImageDraw) -> None:
    draw.rectangle([0, 0, W, 72], fill=DARK_BAR)
    # FanXI logo
    f_bold = _font(38, bold=True)
    draw.text((40, 17), "Fan", font=f_bold, fill=WHITE)
    xi_x = 40 + _text_w(draw, "Fan", f_bold)
    draw.text((xi_x, 17), "XI", font=f_bold, fill=RED)
    # WC badge (right)
    badge_font = _font(14)
    draw.text((W - 40, 29), "WC · 2026", font=badge_font, fill=MUTED, anchor="rm")
    # Red separator line
    draw.rectangle([0, 70, W, 73], fill=RED)


def _text_w(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont) -> int:
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0]


# ─── Match header (y 73..185) ─────────────────────────────────────────────────

def _darken(color: tuple[int, int, int], factor: float = 0.55) -> tuple[int, int, int]:
    return tuple(max(0, int(c * factor)) for c in color)  # type: ignore[return-value]


def _draw_match_header(
    draw: ImageDraw.ImageDraw,
    home_team: str,
    away_team: str,
    group: str,
    kickoff: str,
    venue: str,
) -> None:
    home_col = _darken(_team_color(home_team))
    away_col = _darken(_team_color(away_team))

    # Team bands
    draw.rectangle([0,   73, 560, 185], fill=home_col)
    draw.rectangle([640, 73, W,   185], fill=away_col)
    draw.rectangle([555, 73, 645, 185], fill=DARK_BAR)  # VS gap

    # Team names
    name_font = _font(28, bold=True)
    draw.text((40,  108), home_team.upper(), font=name_font, fill=WHITE)
    draw.text((W - 40, 108), away_team.upper(), font=name_font, fill=WHITE, anchor="ra")

    # VS
    vs_font = _font(20, bold=True)
    draw.text((600, 120), "VS", font=vs_font, fill=MUTED, anchor="mm")

    # Group + date
    meta_font = _font(13)
    try:
        from datetime import datetime
        dt = datetime.fromisoformat(kickoff.replace("Z", "+00:00"))
        date_str = dt.strftime("%d %b %Y · %H:%M UTC")
    except Exception:
        date_str = kickoff[:10]

    group_text = f"{group}  ·  {date_str}"
    draw.text((40, 152), group_text, font=meta_font, fill=MUTED)
    if venue:
        draw.text((40, 170), f"🏟 {venue}"[:55], font=meta_font, fill=(100, 116, 139))


# ─── Mini pitch (y 193..428) ─────────────────────────────────────────────────

_PX, _PY = 60, 193       # pitch origin
_PW, _PH = 1080, 235     # pitch width / height


def _draw_pitch(
    draw: ImageDraw.ImageDraw,
    formation: str,
    team_color: tuple[int, int, int],
) -> None:
    px, py, pw, ph = _PX, _PY, _PW, _PH

    # Pitch surface
    draw.rectangle([px, py, px + pw, py + ph], fill=PITCH_GR)
    draw.rectangle([px, py, px + pw, py + ph], outline=(255, 255, 255, 80), width=2)

    # Halfway line
    mid_x = px + pw // 2
    draw.line([(mid_x, py), (mid_x, py + ph)], fill=(255, 255, 255, 60), width=1)

    # Centre circle (radius 40px)
    cx, cy = mid_x, py + ph // 2
    r = 40
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 255, 255, 50), width=1)

    # Left penalty area (GK side)
    pa_w, pa_h = int(pw * 0.10), int(ph * 0.55)
    pa_y = py + (ph - pa_h) // 2
    draw.rectangle([px, pa_y, px + pa_w, pa_y + pa_h], outline=(255, 255, 255, 40), width=1)

    # Right penalty area (FWD side)
    draw.rectangle([px + pw - pa_w, pa_y, px + pw, pa_y + pa_h], outline=(255, 255, 255, 40), width=1)

    # Formation dots
    positions = FORMATION_POSITIONS.get(formation, FORMATION_POSITIONS[_FALLBACK_FORMATION])
    dot_r = 11
    dot_fill = _darken(team_color, 0.8)
    # Keep dot color visible against green pitch
    if sum(dot_fill) < 60:
        dot_fill = RED

    for norm_x, norm_y in positions:
        dot_cx = int(px + norm_x * pw)
        dot_cy = int(py + norm_y * ph)
        draw.ellipse(
            [dot_cx - dot_r, dot_cy - dot_r, dot_cx + dot_r, dot_cy + dot_r],
            fill=dot_fill,
            outline=WHITE,
            width=2,
        )


# ─── Stats row (y 435..535) ──────────────────────────────────────────────────

def _draw_stats(
    draw: ImageDraw.ImageDraw,
    formation: str,
    team_name: str,
    result_pick: Optional[str],
) -> None:
    labels = ["FORMATION", "TEAM", "RESULT PICK"]
    values = [
        formation or "—",
        (team_name or "—").upper(),
        (result_pick or "—").upper(),
    ]
    cell_w = W // 3
    label_font = _font(11)
    value_font = _font(24, bold=True)

    for i, (lbl, val) in enumerate(zip(labels, values)):
        x0 = i * cell_w + 14
        x1 = (i + 1) * cell_w - 14
        draw.rectangle([x0, 438, x1, 533], fill=(18, 28, 18), outline=(40, 70, 40), width=1)
        mid = (x0 + x1) // 2
        draw.text((mid, 460), lbl, font=label_font, fill=MUTED, anchor="mm")
        color = GOLD if i == 0 else WHITE
        draw.text((mid, 500), val[:16], font=value_font, fill=color, anchor="mm")


# ─── Footer (y 543..630) ─────────────────────────────────────────────────────

def _draw_footer(
    draw: ImageDraw.ImageDraw,
    username: str,
    rank_title: str,
    iq_points: int,
) -> None:
    draw.rectangle([0, 543, W, H], fill=DARK_BAR)
    draw.line([(0, 543), (W, 543)], fill=(30, 50, 30), width=1)

    name_font = _font(22, bold=True)
    meta_font = _font(14)
    url_font  = _font(13)

    draw.text((40, 568), f"@{username}", font=name_font, fill=WHITE)
    draw.text((40, 600), f"{rank_title}  ·  {iq_points:,} IQ pts", font=meta_font, fill=MUTED)
    draw.text((W - 40, 585), "fanxi.vercel.app", font=url_font, fill=(80, 120, 80), anchor="rm")


# ─── Cache helpers ────────────────────────────────────────────────────────────

def _cache_path_pred(user_id: int, match_id: int) -> str:
    return f"/tmp/fanxi_pred_{user_id}_{match_id}.png"


def _cache_path_prof(username: str) -> str:
    return f"/tmp/fanxi_prof_{username}.png"


def _cache_valid(path: str, ttl: int) -> bool:
    return os.path.exists(path) and (time.time() - os.path.getmtime(path)) < ttl


def _save_cache(path: str, data: bytes) -> None:
    try:
        with open(path, "wb") as fh:
            fh.write(data)
    except Exception:
        pass  # /tmp/ may be read-only in some environments


def _render_to_bytes(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=False)
    return buf.getvalue()


# ─── Public: Prediction card ──────────────────────────────────────────────────

def generate_prediction_card(
    user_id: int,
    match_id: int,
    prediction: dict[str, Any],
    match: dict[str, Any],
    username: str,
    rank_title: str,
    iq_points: int,
    bust_cache: bool = False,
) -> bytes:
    """
    Generate a 1200×630 prediction share card.
    Returns raw PNG bytes, cached in /tmp/ for CACHE_TTL_PRED seconds.
    """
    cache = _cache_path_pred(user_id, match_id)
    if not bust_cache and _cache_valid(cache, CACHE_TTL_PRED):
        with open(cache, "rb") as fh:
            return fh.read()

    img = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(img)

    _draw_bg(draw)
    _draw_top_bar(draw)
    _draw_match_header(
        draw,
        home_team=match.get("home_team", "Home"),
        away_team=match.get("away_team", "Away"),
        group=match.get("group", ""),
        kickoff=match.get("kickoff", ""),
        venue=match.get("venue", ""),
    )

    tactics = prediction.get("tactics_data") or {}
    formation = tactics.get("formation") or _FALLBACK_FORMATION
    team_color = _team_color(prediction.get("team_name") or match.get("home_team", ""))

    _draw_pitch(draw, formation, team_color)
    _draw_stats(
        draw,
        formation=formation,
        team_name=prediction.get("team_name", ""),
        result_pick=prediction.get("match_result"),
    )
    _draw_footer(draw, username=username, rank_title=rank_title, iq_points=iq_points)

    data = _render_to_bytes(img)
    _save_cache(cache, data)
    return data


# ─── Public: Profile card ─────────────────────────────────────────────────────

def generate_profile_card(
    username: str,
    profile: dict[str, Any],
    bust_cache: bool = False,
) -> bytes:
    """
    Generate a 1200×630 public scout profile card.
    Returns raw PNG bytes, cached in /tmp/ for CACHE_TTL_PROF seconds.
    """
    cache = _cache_path_prof(username)
    if not bust_cache and _cache_valid(cache, CACHE_TTL_PROF):
        with open(cache, "rb") as fh:
            return fh.read()

    img = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(img)

    _draw_bg(draw)
    _draw_top_bar(draw)

    # ── Avatar circle + username (centred) ──
    av_font    = _font(72, bold=True)
    name_font  = _font(44, bold=True)
    rank_font  = _font(18)
    meta_font  = _font(15)
    label_font = _font(11)

    # Avatar letter
    letter = (profile.get("display_name") or username or "?")[0].upper()
    av_cx, av_cy = 600, 245
    av_r = 65
    draw.ellipse(
        [av_cx - av_r, av_cy - av_r, av_cx + av_r, av_cy + av_r],
        fill=RED,
        outline=WHITE,
        width=3,
    )
    draw.text((av_cx, av_cy), letter, font=av_font, fill=WHITE, anchor="mm")

    # Username
    display = profile.get("display_name") or username
    draw.text((600, 335), display, font=name_font, fill=WHITE, anchor="mm")

    # Rank title
    rank_title = profile.get("rank_title", "Scout")
    draw.text((600, 385), rank_title.upper(), font=rank_font, fill=GOLD, anchor="mm")

    # Nation
    nation = profile.get("favorite_nation") or profile.get("country_allegiance") or ""
    if nation:
        draw.text((600, 415), nation, font=meta_font, fill=MUTED, anchor="mm")

    # Stats row (4 cells)
    stats_labels = ["IQ POINTS", "PREDICTIONS", "FORMATION", "STYLE"]
    stats_values = [
        f"{profile.get('football_iq_points', 0):,}",
        str(profile.get("prediction_count", 0)),
        profile.get("preferred_formation") or "—",
        (profile.get("tactical_style") or "—")[:12],
    ]
    cell_w = W // 4
    val_font = _font(26, bold=True)

    for i, (lbl, val) in enumerate(zip(stats_labels, stats_values)):
        x0 = i * cell_w + 12
        x1 = (i + 1) * cell_w - 12
        draw.rectangle([x0, 445, x1, 530], fill=(18, 28, 18), outline=(40, 70, 40), width=1)
        mid = (x0 + x1) // 2
        draw.text((mid, 466), lbl, font=label_font, fill=MUTED, anchor="mm")
        color = GOLD if i == 0 else WHITE
        draw.text((mid, 500), val, font=val_font, fill=color, anchor="mm")

    # Footer
    _draw_footer(
        draw,
        username=username,
        rank_title=rank_title,
        iq_points=profile.get("football_iq_points", 0),
    )

    data = _render_to_bytes(img)
    _save_cache(cache, data)
    return data
