from __future__ import annotations

from typing import Any, Dict, List

import httpx

from app.config import settings


class FootballAPIError(Exception):
    """Raised when the external football API returns an error."""
    pass


# --- Config from environment via app.config.Settings ---

BASE_URL: str = settings.football_api_base_url.rstrip("/")  # e.g. https://v3.football.api-sports.io
API_KEY: str = settings.football_api_key
LALIGA_ID: int = settings.football_laliga_id
SEASON: int = settings.football_season


def _headers() -> Dict[str, str]:
    """
    Headers for API-Football v3.

    Docs: they expect the key in `x-apisports-key`.
    """
    return {
        "x-apisports-key": API_KEY,
    }


def _get(path: str, params: Dict[str, Any] | None = None) -> Dict[str, Any]:
    """
    Helper for GET requests against API-Football.

    - Ensures leading slash on path.
    - Raises FootballAPIError on non-200 responses.
    - Returns parsed JSON.
    """
    if not path.startswith("/"):
        path = "/" + path

    url = f"{BASE_URL}{path}"

    resp = httpx.get(
        url,
        headers=_headers(),
        params=params or {},
        timeout=15.0,
    )

    # Try to parse JSON regardless of status, so we can show useful error details
    try:
        data = resp.json()
    except Exception:
        raise FootballAPIError(
            f"Non-JSON response from API (status {resp.status_code}): "
            f"{resp.text[:300]}"
        ) from None

    if resp.status_code != 200:
        # API-Football tends to put more info in 'errors' or 'message'
        raise FootballAPIError(
            f"API error {resp.status_code}: {data}"
        )

    return data


def fetch_laliga_teams(
    league_id: int | None = None,
    season: int | None = None,
) -> List[Dict[str, Any]]:
    """
    Fetch all teams in La Liga for a given season.

    Returns list of dicts:
    {
        "external_id": int,   # API's team ID
        "name": str,          # full name
        "short_name": str,    # short/code name
        "league_code": "laliga",
    }
    """
    league_id = league_id or LALIGA_ID
    season = season or SEASON

    data = _get(
        "/teams",
        params={"league": league_id, "season": season},
    )

    teams: List[Dict[str, Any]] = []

    for item in data.get("response", []):
        team = item.get("team") or {}
        if not team:
            continue

        external_id = team.get("id")
        name = team.get("name") or "Unknown"
        # Prefer the team code if present (e.g. "BAR"), fall back to name
        short_name = team.get("code") or name

        teams.append(
            {
                "external_id": external_id,
                "name": name,
                "short_name": short_name,
                "league_code": "laliga",
            }
        )

    return teams


def fetch_laliga_fixtures(
    league_id: int | None = None,
    season: int | None = None,
) -> List[Dict[str, Any]]:
    """
    Fetch La Liga fixtures for a given season.

    Returns list of dicts:
    {
        "external_id": int,                # API's fixture ID
        "league_code": "laliga",
        "home_team_external_id": int,
        "away_team_external_id": int,
        "kickoff_time": str | None,        # ISO8601 datetime string
        "venue": str | None,
        "round": str | None,               # e.g. "Regular Season - 1"
        "status": str,                     # e.g. "NS", "FT", "LIVE"
    }
    """
    league_id = league_id or LALIGA_ID
    season = season or SEASON

    data = _get(
        "/fixtures",
        params={"league": league_id, "season": season},
    )

    fixtures: List[Dict[str, Any]] = []

    for item in data.get("response", []):
        fixture_info = item.get("fixture") or {}
        league_info = item.get("league") or {}
        teams_info = item.get("teams") or {}
        venue_info = fixture_info.get("venue") or {}
        status_info = fixture_info.get("status") or {}

        home_team = teams_info.get("home") or {}
        away_team = teams_info.get("away") or {}

        external_id = fixture_info.get("id")

        fixtures.append(
            {
                "external_id": external_id,
                "league_code": "laliga",
                "home_team_external_id": home_team.get("id"),
                "away_team_external_id": away_team.get("id"),
                "kickoff_time": fixture_info.get("date"),
                "venue": venue_info.get("name"),
                "round": league_info.get("round"),
                "status": status_info.get("short") or status_info.get("long") or "scheduled",
            }
        )

    return fixtures


def test_connection() -> dict[str, Any]:
    """
    Quick sanity check helper.

    Run from backend/:

        (.venv) python -c "from app.services.football_api import test_connection; print(test_connection())"
    """
    data = _get(
        "/teams",
        params={"league": LALIGA_ID, "season": SEASON},
    )

    response_list = data.get("response") or []

    return {
        "results_field": data.get("results"),
        "response_len": len(response_list),
        "errors": data.get("errors"),
        "sample": response_list[0] if response_list else None,
    }

def fetch_world_cup_squads(
    league_id: int = 1, # Official World Cup ID
    season: int = 2026
) -> List[Dict[str, Any]]:
    """
    Fetch all players for the 2026 World Cup.
    This logic will feed into your 'Viral Card' generator.
    """
    # Fetching teams for the World Cup
    data = _get(
        "/teams",
        params={"league": league_id, "season": season},
    )

    all_players: List[Dict[str, Any]] = []

    for item in data.get("response", []):
        team_id = item["team"]["id"]
        # Fetching squad for each team
        squad_data = _get("/players/squads", params={"team": team_id})
        
        for p_item in squad_data.get("response", []):
            players = p_item.get("players", [])
            for p in players:
                all_players.append({
                    "name": p.get("name"),
                    "position": p.get("position"),
                    "team_id": team_id,
                    "external_id": p.get("id")
                })
    return all_players