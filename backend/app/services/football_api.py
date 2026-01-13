from __future__ import annotations
from typing import Any, Dict, List
import httpx
from app.config import settings

class FootballAPIError(Exception):
    """Raised when the external football API returns an error."""
    pass

# --- Config from environment ---
BASE_URL: str = settings.football_api_base_url.rstrip("/")
API_KEY: str = settings.football_api_key
WORLD_CUT_ID: int = 1  # Official FIFA World Cup ID
SEASON: int = 2026

def _headers() -> Dict[str, str]:
    return {"x-apisports-key": API_KEY}

def _get(path: str, params: Dict[str, Any] | None = None) -> Dict[str, Any]:
    """
    Helper for GET requests with Debug Logging to verify info.
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

    try:
        data = resp.json()
    except Exception:
        raise FootballAPIError(f"Non-JSON response (status {resp.status_code})")

    # 🔍 THE SPYGLASS: Verify data in your VS Code terminal
    print(f"DEBUG: Calling {path} | Status: {resp.status_code} | Results: {data.get('results', 0)}")
    
    if data.get("errors"):
        print(f"⚠️ API WARNING: {data['errors']}")

    if resp.status_code != 200:
        raise FootballAPIError(f"API error {resp.status_code}: {data}")

    return data

def fetch_world_cup_teams(league_id: int = WORLD_CUT_ID, season: int = SEASON) -> List[Dict[str, Any]]:
    """Fetches the 48 nations competing in the World Cup."""
    data = _get("/teams", params={"league": league_id, "season": season})
    
    teams = []
    for item in data.get("response", []):
        team = item.get("team", {})
        teams.append({
            "external_id": team.get("id"),
            "name": team.get("name"),
            "short_name": team.get("code") or team.get("name")[:3].upper(),
            "league_code": "worldcup"
        })
    return teams

def fetch_world_cup_squads(league_id: int = WORLD_CUT_ID, season: int = SEASON) -> List[Dict[str, Any]]:
    """
    Fetches all players for the tournament. 
    Essential for the 'Viral Lab' lineup generator.
    """
    teams_data = _get("/teams", params={"league": league_id, "season": season})
    all_players = []

    for item in teams_data.get("response", []):
        team_id = item["team"]["id"]
        team_name = item["team"]["name"]
        
        # Log which team we are currently 'scouting'
        print(f"Scouting players for {team_name}...")
        
        squad_data = _get("/players/squads", params={"team": team_id})
        
        for s_item in squad_data.get("response", []):
            for p in s_item.get("players", []):
                all_players.append({
                    "name": p.get("name"),
                    "position": p.get("position"),
                    "team_id": team_id,
                    "external_id": p.get("id")
                })
    return all_players

def test_connection() -> dict[str, Any]:
    """Sanity check to verify API key and connectivity."""
    return _get("/status") # Calling /status is better for verifying API Key health