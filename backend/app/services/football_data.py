"""
Football-data.org v4 integration.

Free tier limits: 10 requests/minute.
All responses are cached in memory for 60 seconds to stay within rate limits.
Environment variable: FOOTBALL_DATA_API_KEY
"""
import time
from typing import Any, Dict, List, Optional

import httpx

from app.config import settings

BASE_URL = "https://api.football-data.org/v4"
CACHE_TTL = 60  # seconds

# Simple in-memory cache: key -> (timestamp, data)
_cache: Dict[str, tuple] = {}


def _headers() -> dict:
    return {"X-Auth-Token": settings.football_data_api_key}


def _get(path: str, params: Optional[dict] = None) -> Any:
    """Cached GET request to football-data.org."""
    key = f"{path}:{params}"
    now = time.time()
    if key in _cache:
        ts, data = _cache[key]
        if now - ts < CACHE_TTL:
            return data
    with httpx.Client(timeout=10) as client:
        res = client.get(f"{BASE_URL}{path}", headers=_headers(), params=params or {})
        res.raise_for_status()
        data = res.json()
    _cache[key] = (now, data)
    return data


def get_live_matches() -> List[dict]:
    """Return all WC 2026 matches currently in play or paused."""
    try:
        data = _get("/competitions/WC/matches", {"status": "IN_PLAY,PAUSED"})
        return _format_matches(data.get("matches", []))
    except Exception as exc:
        print(f"[football-data] live matches error: {exc}")
        return []


def get_match(match_id: int) -> Optional[dict]:
    """Full match detail including score, status, goals, cards, lineups."""
    try:
        return _get(f"/matches/{match_id}")
    except Exception as exc:
        print(f"[football-data] match {match_id} error: {exc}")
        return None


def get_match_events(match_id: int) -> List[dict]:
    """Goals, cards, and substitutions as a unified timeline."""
    raw = get_match(match_id)
    if not raw:
        return []

    events: List[dict] = []

    for goal in raw.get("goals", []):
        events.append({
            "type": "goal",
            "minute": goal.get("minute"),
            "extra_time": goal.get("extraTime"),
            "team": goal.get("team", {}).get("name"),
            "scorer": goal.get("scorer", {}).get("name"),
            "assist": goal.get("assist", {}).get("name") if goal.get("assist") else None,
        })

    for booking in raw.get("bookings", []):
        events.append({
            "type": "card",
            "card_type": booking.get("card"),  # "YELLOW_CARD" | "RED_CARD"
            "minute": booking.get("minute"),
            "team": booking.get("team", {}).get("name"),
            "player": booking.get("playerReceivingCard", {}).get("name"),
        })

    for sub in raw.get("substitutions", []):
        events.append({
            "type": "sub",
            "minute": sub.get("minute"),
            "team": sub.get("team", {}).get("name"),
            "player_out": sub.get("playerOut", {}).get("name"),
            "player_in": sub.get("playerIn", {}).get("name"),
        })

    # Sort by minute ascending (None minutes go last)
    events.sort(key=lambda e: e.get("minute") or 999)
    return events


def get_match_lineups(match_id: int) -> dict:
    """Home and away starting XI + substitutes."""
    raw = get_match(match_id)
    if not raw:
        return {"home": None, "away": None}

    lineups = raw.get("lineups", [])
    result = {"home": None, "away": None}

    home_team = raw.get("homeTeam", {}).get("name")
    away_team = raw.get("awayTeam", {}).get("name")

    for lineup in lineups:
        team_name = lineup.get("team", {}).get("name")
        side = None
        if team_name == home_team:
            side = "home"
        elif team_name == away_team:
            side = "away"
        else:
            continue
        result[side] = {
            "formation": lineup.get("formation"),
            "team": team_name,
            "startXI": [
                {"name": p.get("name"), "number": p.get("shirtNumber"), "position": p.get("position")}
                for p in lineup.get("startXI", [])
            ],
            "substitutes": [
                {"name": p.get("name"), "number": p.get("shirtNumber"), "position": p.get("position")}
                for p in lineup.get("substitutes", [])
            ],
        }

    return result


def get_match_stats(match_id: int) -> dict:
    """Possession, shots, corners and derived momentum score."""
    raw = get_match(match_id)
    if not raw:
        return {}

    score = raw.get("score", {})
    ft = score.get("fullTime", {})
    ht = score.get("halfTime", {})

    # Stats may not be available on free tier — return what we have
    stats = raw.get("statistics", {})
    home_name = raw.get("homeTeam", {}).get("name", "Home")
    away_name = raw.get("awayTeam", {}).get("name", "Away")

    return {
        "home_team": home_name,
        "away_team": away_name,
        "minute": raw.get("minute"),
        "status": raw.get("status"),
        "score": {
            "home": ft.get("home"),
            "away": ft.get("away"),
            "ht_home": ht.get("home"),
            "ht_away": ht.get("away"),
        },
        "stats": stats,  # pass through raw stats if available
    }


def compute_momentum(match_id: int) -> dict:
    """
    Derive a home/away momentum percentage from available stats.

    Formula (weighted):
      possession 40% + shots on target 35% + corners 15% - cards 10%

    Falls back to goal count ratio if stat data unavailable.
    """
    raw = get_match(match_id)
    if not raw:
        return {"home_pct": 50, "away_pct": 50}

    ft = raw.get("score", {}).get("fullTime", {})
    home_goals = ft.get("home") or 0
    away_goals = ft.get("away") or 0

    stats: list = raw.get("statistics", [])
    if not stats or len(stats) < 2:
        # Fall back: goal-ratio momentum
        total = home_goals + away_goals
        if total == 0:
            return {"home_pct": 50, "away_pct": 50}
        home_pct = round((home_goals / total) * 100)
        return {"home_pct": home_pct, "away_pct": 100 - home_pct}

    def _stat(team_stats: dict, key: str) -> float:
        val = team_stats.get(key, {}).get("value")
        if val is None:
            return 0.0
        if isinstance(val, str) and val.endswith("%"):
            return float(val[:-1])
        try:
            return float(val)
        except (ValueError, TypeError):
            return 0.0

    home_s = {s.get("type"): s.get("value") for s in stats[0].get("statistics", [])}
    away_s = {s.get("type"): s.get("value") for s in stats[1].get("statistics", [])}

    def get_numeric(d: dict, key: str) -> float:
        v = d.get(key)
        if v is None:
            return 0.0
        if isinstance(v, str) and v.endswith("%"):
            return float(v[:-1])
        try:
            return float(v)
        except (ValueError, TypeError):
            return 0.0

    h_poss = get_numeric(home_s, "Ball Possession")
    a_poss = get_numeric(away_s, "Ball Possession") or (100 - h_poss)
    h_shots = get_numeric(home_s, "Shots on Goal")
    a_shots = get_numeric(away_s, "Shots on Goal")
    h_corners = get_numeric(home_s, "Corner Kicks")
    a_corners = get_numeric(away_s, "Corner Kicks")
    h_cards = get_numeric(home_s, "Yellow Cards") + get_numeric(home_s, "Red Cards") * 2
    a_cards = get_numeric(away_s, "Yellow Cards") + get_numeric(away_s, "Red Cards") * 2

    total_shots = h_shots + a_shots or 1
    total_corners = h_corners + a_corners or 1

    h_score = (
        (h_poss * 0.40)
        + ((h_shots / total_shots) * 100 * 0.35)
        + ((h_corners / total_corners) * 100 * 0.15)
        - (h_cards * 5)
    )
    a_score = (
        (a_poss * 0.40)
        + ((a_shots / total_shots) * 100 * 0.35)
        + ((a_corners / total_corners) * 100 * 0.15)
        - (a_cards * 5)
    )

    total = h_score + a_score or 1
    home_pct = max(5, min(95, round((h_score / total) * 100)))
    return {"home_pct": home_pct, "away_pct": 100 - home_pct}


def _format_matches(raw_matches: list) -> list:
    out = []
    for m in raw_matches:
        ft = m.get("score", {}).get("fullTime", {})
        out.append({
            "id": m.get("id"),
            "status": m.get("status"),
            "minute": m.get("minute"),
            "home_team": m.get("homeTeam", {}).get("name"),
            "home_flag": _flag(m.get("homeTeam", {}).get("name", "")),
            "away_team": m.get("awayTeam", {}).get("name"),
            "away_flag": _flag(m.get("awayTeam", {}).get("name", "")),
            "home_goals": ft.get("home"),
            "away_goals": ft.get("away"),
            "kickoff": m.get("utcDate"),
            "venue": m.get("venue"),
        })
    return out


_FLAGS = {
    "Mexico": "🇲🇽", "USA": "🇺🇸", "United States": "🇺🇸", "Canada": "🇨🇦",
    "Uruguay": "🇺🇾", "Argentina": "🇦🇷", "Ecuador": "🇪🇨", "Chile": "🇨🇱",
    "Peru": "🇵🇪", "France": "🇫🇷", "Morocco": "🇲🇦", "Belgium": "🇧🇪",
    "Switzerland": "🇨🇭", "Brazil": "🇧🇷", "Colombia": "🇨🇴", "Paraguay": "🇵🇾",
    "Venezuela": "🇻🇪", "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Senegal": "🇸🇳", "Netherlands": "🇳🇱",
    "Iran": "🇮🇷", "Spain": "🇪🇸", "Japan": "🇯🇵", "South Korea": "🇰🇷",
    "Korea Republic": "🇰🇷", "Saudi Arabia": "🇸🇦", "Germany": "🇩🇪", "Austria": "🇦🇹",
    "Poland": "🇵🇱", "Ukraine": "🇺🇦", "Portugal": "🇵🇹", "Nigeria": "🇳🇬",
    "Ghana": "🇬🇭", "Cameroon": "🇨🇲", "Croatia": "🇭🇷", "Algeria": "🇩🇿",
    "Tunisia": "🇹🇳", "Egypt": "🇪🇬", "Australia": "🇦🇺", "New Zealand": "🇳🇿",
    "Serbia": "🇷🇸", "Turkey": "🇹🇷", "Türkiye": "🇹🇷", "Costa Rica": "🇨🇷",
    "Panama": "🇵🇦", "Jamaica": "🇯🇲", "Bolivia": "🇧🇴", "Italy": "🇮🇹",
    "South Africa": "🇿🇦", "Côte d'Ivoire": "🇨🇮", "Czech Republic": "🇨🇿",
}


def _flag(name: str) -> str:
    return _FLAGS.get(name, "🏳️")
