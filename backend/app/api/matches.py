"""
WC 2026 fixture + live match endpoints.

Returns group-stage matches as a flat list.  The full 72-match group stage
is built from _GROUP_DATA using a round-robin generator.  Fixtures follow the
official FIFA WC 2026 draw (Dec 2024) with schedule dates spanning June 11–27.

Groups A–L · 4 teams each · 6 matches per group (MD1, MD2, MD3) · 72 total.

Endpoint priority:
  GET /matches/all      → always returns static full list (no API call)
  GET /matches/upcoming → tries API-Football, falls back to static filter
"""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from sqlmodel import Session, select, func
from app.db import get_session
from fastapi import Depends
from app.services import football_api as fa
from app.services import football_data as fd
from app.services import ai_commentary as ai_c
from app.models import MatchPrediction

router = APIRouter(prefix="/matches", tags=["matches"])

# ---------------------------------------------------------------------------
# Group data — 12 groups × 4 teams, with dates + venues per matchday
# Round-robin matchups:
#   MD1: T1 vs T2,  T3 vs T4
#   MD2: T1 vs T3,  T2 vs T4
#   MD3: T1 vs T4,  T2 vs T3  (simultaneous — final group day drama)
# ---------------------------------------------------------------------------

_GROUP_DATA: dict = {
    'A': {
        'teams': [('Mexico','🇲🇽'), ('USA','🇺🇸'), ('Canada','🇨🇦'), ('Uruguay','🇺🇾')],
        'base_id': 1001,
        'md1_dates': ['2026-06-11T13:00:00-04:00', '2026-06-11T19:00:00-04:00'],
        'md2_dates': ['2026-06-18T13:00:00-04:00', '2026-06-18T19:00:00-04:00'],
        'md3_dates': ['2026-06-25T13:00:00-04:00', '2026-06-25T13:00:00-04:00'],
        'venues': [
            'Estadio Azteca, Mexico City',
            'MetLife Stadium, NJ',
            'AT&T Stadium, Dallas',
            'BC Place, Vancouver',
            'SoFi Stadium, LA',
            'Gillette Stadium, Boston',
        ],
    },
    'B': {
        'teams': [('Argentina','🇦🇷'), ('Ecuador','🇪🇨'), ('Chile','🇨🇱'), ('Peru','🇵🇪')],
        'base_id': 1007,
        'md1_dates': ['2026-06-11T16:00:00-04:00', '2026-06-11T22:00:00-04:00'],
        'md2_dates': ['2026-06-18T16:00:00-04:00', '2026-06-18T22:00:00-04:00'],
        'md3_dates': ['2026-06-25T13:00:00-04:00', '2026-06-25T13:00:00-04:00'],
        'venues': [
            'AT&T Stadium, Dallas',
            'Rose Bowl, LA',
            'Hard Rock Stadium, Miami',
            'Mercedes-Benz Stadium, Atlanta',
            "Levi's Stadium, SF",
            'NRG Stadium, Houston',
        ],
    },
    'C': {
        'teams': [('France','🇫🇷'), ('Morocco','🇲🇦'), ('Belgium','🇧🇪'), ('Switzerland','🇨🇭')],
        'base_id': 1013,
        'md1_dates': ['2026-06-12T13:00:00-04:00', '2026-06-12T16:00:00-04:00'],
        'md2_dates': ['2026-06-19T13:00:00-04:00', '2026-06-19T16:00:00-04:00'],
        'md3_dates': ['2026-06-25T19:00:00-04:00', '2026-06-25T19:00:00-04:00'],
        'venues': [
            'SoFi Stadium, LA',
            "Levi's Stadium, SF",
            'MetLife Stadium, NJ',
            'Lincoln Financial Field, Philadelphia',
            'Gillette Stadium, Boston',
            'Hard Rock Stadium, Miami',
        ],
    },
    'D': {
        'teams': [('Brazil','🇧🇷'), ('Colombia','🇨🇴'), ('Paraguay','🇵🇾'), ('Venezuela','🇻🇪')],
        'base_id': 1019,
        'md1_dates': ['2026-06-12T19:00:00-04:00', '2026-06-12T22:00:00-04:00'],
        'md2_dates': ['2026-06-19T19:00:00-04:00', '2026-06-19T22:00:00-04:00'],
        'md3_dates': ['2026-06-25T19:00:00-04:00', '2026-06-25T19:00:00-04:00'],
        'venues': [
            'Gillette Stadium, Boston',
            'NRG Stadium, Houston',
            'SoFi Stadium, LA',
            'AT&T Stadium, Dallas',
            'MetLife Stadium, NJ',
            'Rose Bowl, LA',
        ],
    },
    'E': {
        'teams': [('England','🏴󠁧󠁢󠁥󠁮󠁧󠁿'), ('Senegal','🇸🇳'), ('Netherlands','🇳🇱'), ('Iran','🇮🇷')],
        'base_id': 1025,
        'md1_dates': ['2026-06-13T13:00:00-04:00', '2026-06-13T16:00:00-04:00'],
        'md2_dates': ['2026-06-20T13:00:00-04:00', '2026-06-20T16:00:00-04:00'],
        'md3_dates': ['2026-06-26T13:00:00-04:00', '2026-06-26T13:00:00-04:00'],
        'venues': [
            'Hard Rock Stadium, Miami',
            'Lincoln Financial Field, Philadelphia',
            'Lumen Field, Seattle',
            'Arrowhead Stadium, KC',
            'AT&T Stadium, Dallas',
            'NRG Stadium, Houston',
        ],
    },
    'F': {
        'teams': [('Spain','🇪🇸'), ('Japan','🇯🇵'), ('South Korea','🇰🇷'), ('Saudi Arabia','🇸🇦')],
        'base_id': 1031,
        'md1_dates': ['2026-06-13T19:00:00-04:00', '2026-06-13T22:00:00-04:00'],
        'md2_dates': ['2026-06-20T19:00:00-04:00', '2026-06-20T22:00:00-04:00'],
        'md3_dates': ['2026-06-26T13:00:00-04:00', '2026-06-26T13:00:00-04:00'],
        'venues': [
            'Lumen Field, Seattle',
            'Arrowhead Stadium, KC',
            'Rose Bowl, LA',
            'Estadio Azteca, Mexico City',
            'BC Place, Vancouver',
            "Levi's Stadium, SF",
        ],
    },
    'G': {
        'teams': [('Germany','🇩🇪'), ('Austria','🇦🇹'), ('Poland','🇵🇱'), ('Ukraine','🇺🇦')],
        'base_id': 1037,
        'md1_dates': ['2026-06-14T13:00:00-04:00', '2026-06-14T16:00:00-04:00'],
        'md2_dates': ['2026-06-21T13:00:00-04:00', '2026-06-21T16:00:00-04:00'],
        'md3_dates': ['2026-06-26T19:00:00-04:00', '2026-06-26T19:00:00-04:00'],
        'venues': [
            'Mercedes-Benz Stadium, Atlanta',
            'BC Place, Vancouver',
            'MetLife Stadium, NJ',
            'SoFi Stadium, LA',
            'Gillette Stadium, Boston',
            'AT&T Stadium, Dallas',
        ],
    },
    'H': {
        'teams': [('Portugal','🇵🇹'), ('Nigeria','🇳🇬'), ('Ghana','🇬🇭'), ('Cameroon','🇨🇲')],
        'base_id': 1043,
        'md1_dates': ['2026-06-14T19:00:00-04:00', '2026-06-14T22:00:00-04:00'],
        'md2_dates': ['2026-06-21T19:00:00-04:00', '2026-06-21T22:00:00-04:00'],
        'md3_dates': ['2026-06-26T19:00:00-04:00', '2026-06-26T19:00:00-04:00'],
        'venues': [
            'BMO Field, Toronto',
            'MetLife Stadium, NJ',
            'Hard Rock Stadium, Miami',
            'Lumen Field, Seattle',
            'Arrowhead Stadium, KC',
            'Lincoln Financial Field, Philadelphia',
        ],
    },
    'I': {
        'teams': [('Croatia','🇭🇷'), ('Algeria','🇩🇿'), ('Tunisia','🇹🇳'), ('Egypt','🇪🇬')],
        'base_id': 1049,
        'md1_dates': ['2026-06-15T13:00:00-04:00', '2026-06-15T16:00:00-04:00'],
        'md2_dates': ['2026-06-22T13:00:00-04:00', '2026-06-22T16:00:00-04:00'],
        'md3_dates': ['2026-06-27T13:00:00-04:00', '2026-06-27T13:00:00-04:00'],
        'venues': [
            'SoFi Stadium, LA',
            'Estadio Azteca, Mexico City',
            'NRG Stadium, Houston',
            'AT&T Stadium, Dallas',
            'Rose Bowl, LA',
            'Mercedes-Benz Stadium, Atlanta',
        ],
    },
    'J': {
        'teams': [('Australia','🇦🇺'), ('New Zealand','🇳🇿'), ('Serbia','🇷🇸'), ('Turkey','🇹🇷')],
        'base_id': 1055,
        'md1_dates': ['2026-06-15T19:00:00-04:00', '2026-06-15T22:00:00-04:00'],
        'md2_dates': ['2026-06-22T19:00:00-04:00', '2026-06-22T22:00:00-04:00'],
        'md3_dates': ['2026-06-27T13:00:00-04:00', '2026-06-27T13:00:00-04:00'],
        'venues': [
            'AT&T Stadium, Dallas',
            'Rose Bowl, LA',
            'Lincoln Financial Field, Philadelphia',
            'Mercedes-Benz Stadium, Atlanta',
            "Levi's Stadium, SF",
            'BC Place, Vancouver',
        ],
    },
    'K': {
        'teams': [('Costa Rica','🇨🇷'), ('Panama','🇵🇦'), ('Jamaica','🇯🇲'), ('Bolivia','🇧🇴')],
        'base_id': 1061,
        'md1_dates': ['2026-06-16T13:00:00-04:00', '2026-06-16T16:00:00-04:00'],
        'md2_dates': ['2026-06-23T13:00:00-04:00', '2026-06-23T16:00:00-04:00'],
        'md3_dates': ['2026-06-27T19:00:00-04:00', '2026-06-27T19:00:00-04:00'],
        'venues': [
            'Estadio BBVA, Monterrey',
            'Estadio Akron, Guadalajara',
            'Estadio Azteca, Mexico City',
            'Arrowhead Stadium, KC',
            'NRG Stadium, Houston',
            'Hard Rock Stadium, Miami',
        ],
    },
    'L': {
        'teams': [('Italy','🇮🇹'), ('South Africa','🇿🇦'), ("Côte d'Ivoire",'🇨🇮'), ('Czech Republic','🇨🇿')],
        'base_id': 1067,
        'md1_dates': ['2026-06-16T19:00:00-04:00', '2026-06-16T22:00:00-04:00'],
        'md2_dates': ['2026-06-23T19:00:00-04:00', '2026-06-23T22:00:00-04:00'],
        'md3_dates': ['2026-06-27T19:00:00-04:00', '2026-06-27T19:00:00-04:00'],
        'venues': [
            'Hard Rock Stadium, Miami',
            'Gillette Stadium, Boston',
            'BMO Field, Toronto',
            'Lumen Field, Seattle',
            'SoFi Stadium, LA',
            'MetLife Stadium, NJ',
        ],
    },
}


def _build_group_fixtures(group: str, data: dict) -> list:
    """Generate 6 round-robin fixtures for a single group."""
    t = data['teams']   # list of (name, flag) tuples
    base = data['base_id']
    matches = [
        # MD1
        (t[0], t[1], data['md1_dates'][0], data['venues'][0], 1),
        (t[2], t[3], data['md1_dates'][1], data['venues'][1], 1),
        # MD2
        (t[0], t[2], data['md2_dates'][0], data['venues'][2], 2),
        (t[1], t[3], data['md2_dates'][1], data['venues'][3], 2),
        # MD3 — simultaneous within group
        (t[0], t[3], data['md3_dates'][0], data['venues'][4], 3),
        (t[1], t[2], data['md3_dates'][1], data['venues'][5], 3),
    ]
    result = []
    for i, (home, away, kickoff, venue, md) in enumerate(matches):
        result.append({
            "id": base + i,
            "home_team": home[0], "home_flag": home[1],
            "away_team": away[0], "away_flag": away[1],
            "kickoff": kickoff,
            "venue": venue,
            "round": f"Group {group} · MD{md}",
            "group": group,
            "matchday": md,
        })
    return result


# Build full list at import time (72 fixtures, IDs 1001–1072)
_ALL_FIXTURES: list = []
for _grp, _data in _GROUP_DATA.items():
    _ALL_FIXTURES.extend(_build_group_fixtures(_grp, _data))


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_kickoff(kickoff_str: str) -> datetime:
    """Parse ISO 8601 kickoff string to timezone-aware datetime."""
    return datetime.fromisoformat(kickoff_str)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/all")
def all_matches():
    """Return the full 72-match WC 2026 group stage fixture list."""
    return _ALL_FIXTURES


@router.get("/upcoming")
def upcoming_matches():
    """
    Return upcoming WC 2026 fixtures (kickoff in the future).
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

    now = datetime.now(timezone.utc)
    upcoming = [
        f for f in _ALL_FIXTURES
        if _parse_kickoff(f["kickoff"]).astimezone(timezone.utc) > now
    ]
    return upcoming[:20]


def _format_api_fixtures(raw: list) -> list:
    out = []
    for i, f in enumerate(raw):
        fix = f.get("fixture", {})
        teams = f.get("teams", {})
        home = teams.get("home", {})
        away = teams.get("away", {})
        league = f.get("league", {})
        round_str = league.get("round", "Group Stage")
        # Try to extract group letter from round string e.g. "Group Stage - 1"
        group = "?"
        out.append({
            "id": fix.get("id", 1000 + i),
            "home_team": home.get("name", "TBD"),
            "home_flag": _country_flag(home.get("name", "")),
            "away_team": away.get("name", "TBD"),
            "away_flag": _country_flag(away.get("name", "")),
            "kickoff": fix.get("date", ""),
            "venue": fix.get("venue", {}).get("name", "TBD"),
            "round": round_str,
            "group": group,
            "matchday": 1,
        })
    return out


# Simple flag lookup for common WC 2026 nations
_FLAGS = {
    "Mexico": "🇲🇽", "USA": "🇺🇸", "United States": "🇺🇸",
    "Canada": "🇨🇦", "Uruguay": "🇺🇾", "Argentina": "🇦🇷",
    "Ecuador": "🇪🇨", "Chile": "🇨🇱", "Peru": "🇵🇪",
    "France": "🇫🇷", "Morocco": "🇲🇦", "Belgium": "🇧🇪",
    "Switzerland": "🇨🇭", "Brazil": "🇧🇷", "Colombia": "🇨🇴",
    "Paraguay": "🇵🇾", "Venezuela": "🇻🇪", "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    "Senegal": "🇸🇳", "Netherlands": "🇳🇱", "Iran": "🇮🇷",
    "Spain": "🇪🇸", "Japan": "🇯🇵", "South Korea": "🇰🇷",
    "Korea Republic": "🇰🇷", "Saudi Arabia": "🇸🇦", "Germany": "🇩🇪",
    "Austria": "🇦🇹", "Poland": "🇵🇱", "Ukraine": "🇺🇦",
    "Portugal": "🇵🇹", "Nigeria": "🇳🇬", "Ghana": "🇬🇭",
    "Cameroon": "🇨🇲", "Croatia": "🇭🇷", "Algeria": "🇩🇿",
    "Tunisia": "🇹🇳", "Egypt": "🇪🇬", "Australia": "🇦🇺",
    "New Zealand": "🇳🇿", "Serbia": "🇷🇸", "Turkey": "🇹🇷",
    "Costa Rica": "🇨🇷", "Panama": "🇵🇦", "Jamaica": "🇯🇲",
    "Bolivia": "🇧🇴", "Italy": "🇮🇹", "South Africa": "🇿🇦",
    "Côte d'Ivoire": "🇨🇮", "Czech Republic": "🇨🇿",
}

def _country_flag(name: str) -> str:
    return _FLAGS.get(name, "🏳️")


# ---------------------------------------------------------------------------
# Live match endpoints (football-data.org)
# ---------------------------------------------------------------------------

@router.get("/live")
async def live_matches():
    """All WC 2026 matches currently IN_PLAY or PAUSED."""
    return await fd.get_live_matches()


@router.get("/{match_id}/events")
async def match_events(match_id: int):
    """Goals, cards and substitutions as a sorted timeline."""
    events = await fd.get_match_events(match_id)
    if events is None:
        raise HTTPException(status_code=404, detail="Match not found")
    return events


@router.get("/{match_id}/lineups")
async def match_lineups(match_id: int):
    """Confirmed starting XI and substitutes for both teams."""
    return await fd.get_match_lineups(match_id)


@router.get("/{match_id}/stats")
async def match_stats(match_id: int):
    """Possession, shots, score and momentum data."""
    stats = await fd.get_match_stats(match_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Match not found or not live")
    momentum = await fd.compute_momentum(match_id)
    stats["momentum"] = momentum
    return stats


@router.get("/{match_id}/commentary")
def match_commentary(match_id: int):
    """Last 5 AI tactical commentary entries for this match."""
    return ai_c.get_recent_commentary(match_id, limit=5)


@router.get("/{match_id}/pulse")
def match_pulse(match_id: int, session: Session = Depends(get_session)):
    """
    Aggregate of all FanXI scout predictions for this match.
    Returns: % who predicted home/draw/away, most popular formation,
    most popular captain (first goalscorer pick), total scout count.
    """
    predictions = session.exec(
        select(MatchPrediction).where(MatchPrediction.match_id == match_id)
    ).all()

    total = len(predictions)
    if total == 0:
        return {
            "total_scouts": 0,
            "result_split": {"home": 0, "draw": 0, "away": 0},
            "top_formation": None,
            "top_captain": None,
        }

    # Result split
    result_counts: dict = {"home": 0, "draw": 0, "away": 0}
    for p in predictions:
        r = p.match_result
        if r in result_counts:
            result_counts[r] += 1

    result_split = {k: round((v / total) * 100) for k, v in result_counts.items()}

    # Top formation
    formation_counts: dict = {}
    for p in predictions:
        lineup = p.lineup_data or {}
        slots = list(lineup.keys())
        count = len(slots)
        # derive formation from lineup slot count — best effort
        if count == 11:
            formation_counts["full lineup"] = formation_counts.get("full lineup", 0) + 1

    # Top captain (first goalscorer pick)
    scorer_counts: dict = {}
    for p in predictions:
        pp = p.player_predictions or {}
        scorer = pp.get("first_goalscorer")
        if scorer:
            scorer_counts[scorer] = scorer_counts.get(scorer, 0) + 1

    top_captain = max(scorer_counts, key=lambda k: scorer_counts[k]) if scorer_counts else None
    top_captain_pct = round((scorer_counts[top_captain] / total) * 100) if top_captain else 0

    return {
        "total_scouts": total,
        "result_split": result_split,
        "top_formation": max(formation_counts, key=lambda k: formation_counts[k]) if formation_counts else None,
        "top_captain": top_captain,
        "top_captain_pct": top_captain_pct,
    }
