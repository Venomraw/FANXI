from datetime import datetime

from fastapi import APIRouter

from app.schemas import Team, Match

router = APIRouter(
    prefix="/teams",
    tags=["teams"],
)

# Reuse the same teams (duplicated from leagues.py for now)
MOCK_TEAMS = [
    Team(id=1, name="FC Barcelona",       short_name="Barcelona",   league_code="laliga"),
    Team(id=2, name="Real Madrid CF",     short_name="Real Madrid", league_code="laliga"),
    Team(id=3, name="Atlético de Madrid", short_name="Atlético",    league_code="laliga"),
    Team(id=4, name="Sevilla FC",         short_name="Sevilla",     league_code="laliga"),
]

# Mock fixtures – dates are arbitrary, just examples
MOCK_MATCHES = [
    Match(
        id=1,
        league_code="laliga",
        home_team_id=1,   # Barcelona
        away_team_id=2,   # Real Madrid
        kickoff_time=datetime(2025, 1, 20, 20, 0),
        venue="Olympic Stadium",
        round="Matchday 1",
    ),
    Match(
        id=2,
        league_code="laliga",
        home_team_id=3,   # Atlético
        away_team_id=1,   # Barcelona
        kickoff_time=datetime(2025, 1, 27, 20, 0),
        venue="Cívitas Metropolitano",
        round="Matchday 2",
    ),
    Match(
        id=3,
        league_code="laliga",
        home_team_id=1,   # Barcelona
        away_team_id=4,   # Sevilla
        kickoff_time=datetime(2025, 2, 3, 20, 0),
        venue="Olympic Stadium",
        round="Matchday 3",
    ),
]


@router.get("/{team_id}/matches", response_model=list[Match])
def list_matches_for_team(team_id: int):
    """List matches where the given team is home or away."""
    team_matches = [
        match
        for match in MOCK_MATCHES
        if match.home_team_id == team_id or match.away_team_id == team_id
    ]
    # Returning [] is fine if team has no fixtures yet
    return team_matches
