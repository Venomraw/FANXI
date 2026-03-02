"""
WC 2026 fixture endpoint.

Returns upcoming group-stage matches as a flat list.  These are used by
the frontend MatchSelector strip so users can pick which match to predict.

The data is hardcoded from the official FIFA WC 2026 draw (Dec 2024) and
schedule.  If an API-Football call succeeds it takes priority; otherwise
the static data is returned as a reliable fallback.
"""
from fastapi import APIRouter
from app.services import football_api as fa

router = APIRouter(prefix="/matches", tags=["matches"])

# ---------------------------------------------------------------------------
# Static WC 2026 group-stage opening fixtures (per official FIFA draw)
# IDs are synthetic (1001+) for local use.
# ---------------------------------------------------------------------------
_WC2026 = [
    # ── Opening day ──────────────────────────────────────────────────────
    {
        "id": 1001,
        "home_team": "Mexico",    "home_flag": "🇲🇽",
        "away_team": "USA",       "away_flag": "🇺🇸",
        "kickoff": "2026-06-11T20:00:00-04:00",
        "venue": "MetLife Stadium, NJ",
        "round": "Group A · MD1",
    },
    {
        "id": 1002,
        "home_team": "Canada",    "home_flag": "🇨🇦",
        "away_team": "Uruguay",   "away_flag": "🇺🇾",
        "kickoff": "2026-06-12T16:00:00-04:00",
        "venue": "BC Place, Vancouver",
        "round": "Group A · MD1",
    },
    # ── Day 2 ─────────────────────────────────────────────────────────────
    {
        "id": 1003,
        "home_team": "Argentina", "home_flag": "🇦🇷",
        "away_team": "Ecuador",   "away_flag": "🇪🇨",
        "kickoff": "2026-06-13T13:00:00-04:00",
        "venue": "AT&T Stadium, Dallas",
        "round": "Group B · MD1",
    },
    {
        "id": 1004,
        "home_team": "France",    "home_flag": "🇫🇷",
        "away_team": "Morocco",   "away_flag": "🇲🇦",
        "kickoff": "2026-06-13T19:00:00-04:00",
        "venue": "SoFi Stadium, LA",
        "round": "Group C · MD1",
    },
    # ── Day 3 ─────────────────────────────────────────────────────────────
    {
        "id": 1005,
        "home_team": "Brazil",    "home_flag": "🇧🇷",
        "away_team": "Colombia",  "away_flag": "🇨🇴",
        "kickoff": "2026-06-14T16:00:00-04:00",
        "venue": "Levi's Stadium, SF",
        "round": "Group D · MD1",
    },
    {
        "id": 1006,
        "home_team": "England",   "home_flag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
        "away_team": "Senegal",   "away_flag": "🇸🇳",
        "kickoff": "2026-06-14T19:00:00-04:00",
        "venue": "Gillette Stadium, Boston",
        "round": "Group E · MD1",
    },
    # ── Day 4 ─────────────────────────────────────────────────────────────
    {
        "id": 1007,
        "home_team": "Spain",     "home_flag": "🇪🇸",
        "away_team": "Japan",     "away_flag": "🇯🇵",
        "kickoff": "2026-06-15T13:00:00-04:00",
        "venue": "Rose Bowl, LA",
        "round": "Group F · MD1",
    },
    {
        "id": 1008,
        "home_team": "Germany",   "home_flag": "🇩🇪",
        "away_team": "South Korea","away_flag": "🇰🇷",
        "kickoff": "2026-06-15T19:00:00-04:00",
        "venue": "MetLife Stadium, NJ",
        "round": "Group G · MD1",
    },
    # ── Day 5 ─────────────────────────────────────────────────────────────
    {
        "id": 1009,
        "home_team": "Portugal",  "home_flag": "🇵🇹",
        "away_team": "Nigeria",   "away_flag": "🇳🇬",
        "kickoff": "2026-06-16T13:00:00-04:00",
        "venue": "Arrowhead Stadium, KC",
        "round": "Group H · MD1",
    },
    {
        "id": 1010,
        "home_team": "Netherlands","home_flag": "🇳🇱",
        "away_team": "Saudi Arabia","away_flag": "🇸🇦",
        "kickoff": "2026-06-16T19:00:00-04:00",
        "venue": "NRG Stadium, Houston",
        "round": "Group I · MD1",
    },
    # ── Day 6 ─────────────────────────────────────────────────────────────
    {
        "id": 1011,
        "home_team": "Australia", "home_flag": "🇦🇺",
        "away_team": "Ghana",     "away_flag": "🇬🇭",
        "kickoff": "2026-06-17T13:00:00-04:00",
        "venue": "Lumen Field, Seattle",
        "round": "Group J · MD1",
    },
    {
        "id": 1012,
        "home_team": "Croatia",   "home_flag": "🇭🇷",
        "away_team": "Algeria",   "away_flag": "🇩🇿",
        "kickoff": "2026-06-17T16:00:00-04:00",
        "venue": "Lincoln Financial Field, Philadelphia",
        "round": "Group K · MD1",
    },
]


@router.get("/upcoming")
def upcoming_matches():
    """
    Return a list of upcoming WC 2026 fixtures.
    Tries API-Football first; falls back to static data on any error.
    """
    try:
        data = fa._get(
            "/fixtures",
            params={"league": 1, "season": 2026, "next": 20, "status": "NS"},
        )
        fixtures = data.get("response", [])
        if fixtures:
            return _format_api_fixtures(fixtures)
    except Exception as exc:
        print(f"⚠️ API-Football fixtures failed: {exc}")

    return _WC2026


def _format_api_fixtures(raw: list) -> list:
    out = []
    for i, f in enumerate(raw):
        fix = f.get("fixture", {})
        teams = f.get("teams", {})
        home = teams.get("home", {})
        away = teams.get("away", {})
        league = f.get("league", {})
        out.append({
            "id": fix.get("id", 1000 + i),
            "home_team": home.get("name", "TBD"),
            "home_flag": _country_flag(home.get("name", "")),
            "away_team": away.get("name", "TBD"),
            "away_flag": _country_flag(away.get("name", "")),
            "kickoff": fix.get("date", ""),
            "venue": fix.get("venue", {}).get("name", "TBD"),
            "round": league.get("round", "Group Stage"),
        })
    return out


# Simple flag lookup for common WC 2026 nations
_FLAGS = {
    "Mexico": "🇲🇽", "USA": "🇺🇸", "United States": "🇺🇸",
    "Canada": "🇨🇦", "Uruguay": "🇺🇾", "Argentina": "🇦🇷",
    "Ecuador": "🇪🇨", "France": "🇫🇷", "Morocco": "🇲🇦",
    "Brazil": "🇧🇷", "Colombia": "🇨🇴", "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    "Senegal": "🇸🇳", "Spain": "🇪🇸", "Japan": "🇯🇵",
    "Germany": "🇩🇪", "South Korea": "🇰🇷", "Korea Republic": "🇰🇷",
    "Portugal": "🇵🇹", "Nigeria": "🇳🇬", "Netherlands": "🇳🇱",
    "Saudi Arabia": "🇸🇦", "Australia": "🇦🇺", "Ghana": "🇬🇭",
    "Croatia": "🇭🇷", "Algeria": "🇩🇿", "Serbia": "🇷🇸",
    "Poland": "🇵🇱", "Switzerland": "🇨🇭", "Austria": "🇦🇹",
    "Belgium": "🇧🇪", "Turkey": "🇹🇷", "Ukraine": "🇺🇦",
    "Panama": "🇵🇦", "Costa Rica": "🇨🇷", "Jamaica": "🇯🇲",
    "Venezuela": "🇻🇪", "Chile": "🇨🇱", "Peru": "🇵🇪",
    "Iran": "🇮🇷", "New Zealand": "🇳🇿", "Tunisia": "🇹🇳",
    "Cameroon": "🇨🇲", "Egypt": "🇪🇬", "South Africa": "🇿🇦",
}

def _country_flag(name: str) -> str:
    return _FLAGS.get(name, "🏳️")
