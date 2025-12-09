from fastapi import APIRouter, HTTPException

from app.schemas import League, Team

router = APIRouter(
    prefix="/leagues",
    tags=["leagues"],
)

# --- Mock data for now ---

MOCK_LEAGUES = [
    League(code="laliga", name="La Liga"),
]

MOCK_TEAMS = [
    Team(id=1, name="FC Barcelona",       short_name="Barcelona",   league_code="laliga"),
    Team(id=2, name="Real Madrid CF",     short_name="Real Madrid", league_code="laliga"),
    Team(id=3, name="Atlético de Madrid", short_name="Atlético",    league_code="laliga"),
    Team(id=4, name="Sevilla FC",         short_name="Sevilla",     league_code="laliga"),
]

@router.get("/", response_model=list[League])
def list_leagues():
    """List all available leagues (v1: only La Liga)."""
    return MOCK_LEAGUES

@router.get("/{league_code}/teams", response_model=list[Team])
def list_teams_for_league(league_code: str):
    """List teams for a given league code."""
    leagues = {league.code for league in MOCK_LEAGUES}
    if league_code not in leagues:
        raise HTTPException(status_code=404, detail="League not found")

    teams = [team for team in MOCK_TEAMS if team.league_code == league_code]
    return teams
