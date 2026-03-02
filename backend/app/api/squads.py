"""
Squad endpoint — returns real player data for a national team.

Flow:
  0. Check static squad data (instant, no API calls)
  1. Check TeamSquadCache (24-hour TTL)
  2. Cache miss → search API-Football for the national team by name
  3. Fetch /players/squads for that team_id
  4. Cache the result
  5. Fall back to positional placeholders if the API is unavailable
"""
from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.db import get_session
from app.models import TeamSquadCache
from app.services import football_api as fa
from app.data.static_squads import STATIC_SQUADS

router = APIRouter(tags=["squads"])


@router.get("/squad/{team_name}")
async def get_squad(team_name: str, session: Session = Depends(get_session)):
    """
    Return the squad for *team_name* (national team).
    Players are returned as:  [{name, number, position}, ...]
    """
    # ── 0. Check static squad data first ───────────────────────────────────
    static = STATIC_SQUADS.get(team_name) or next(
        (v for k, v in STATIC_SQUADS.items() if k.lower() == team_name.lower()), None
    )
    if static:
        return {"team": team_name, "players": static, "source": "static"}

    # ── 1. Try cache ───────────────────────────────────────────────────────
    cached = fa.get_cached_squad(team_name, session)
    if cached:
        return {"team": team_name, "players": cached, "source": "cache"}

    # ── 2. Resolve team_id via API-Football ────────────────────────────────
    try:
        search = fa._get("/teams", params={"name": team_name, "type": "national"})
        results = search.get("response", [])

        if not results:
            return {
                "team": team_name,
                "players": _fallback_squad(team_name),
                "source": "fallback",
            }

        team_id = results[0]["team"]["id"]

        # ── 3. Fetch & cache squad ─────────────────────────────────────────
        players = fa.fetch_and_cache_squad(team_name, team_id, session)
        return {"team": team_name, "players": players, "source": "api"}

    except Exception as exc:
        print(f"⚠️ Squad fetch failed for {team_name}: {exc}")
        return {
            "team": team_name,
            "players": _fallback_squad(team_name),
            "source": "fallback",
        }


def _fallback_squad(team_name: str) -> list:
    """
    Positional placeholders used when the API is unavailable or returns
    nothing.  Prefixed with the 3-letter team code so they are identifiable
    in the bench.
    """
    code = team_name[:3].upper()
    slots = [
        ("GK", 1), ("RB", 2), ("CB", 3), ("CB", 4), ("LB", 5),
        ("CDM", 6), ("CM", 8), ("CAM", 10), ("RW", 7), ("ST", 9), ("LW", 11),
        ("SUB", 12), ("SUB", 13), ("SUB", 14), ("SUB", 16), ("GK", 23),
    ]
    return [
        {"name": f"{code} #{num}", "number": num, "position": pos}
        for pos, num in slots
    ]
