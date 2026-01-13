from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select

from app.schemas import Team, Match
from app.db import get_session
from app.models import TeamDB, MatchDB

router = APIRouter(
    prefix="/teams",
    tags=["teams"],
)

# Mock teams updated to satisfy Schema requirements
MOCK_TEAMS = [
    Team(id=1, name="FC Barcelona",       short_name="Barcelona",   league_code="laliga"),
    Team(id=2, name="Real Madrid CF",     short_name="Real Madrid", league_code="laliga"),
    Team(id=3, name="Atlético de Madrid", short_name="Atlético",    league_code="laliga"),
    Team(id=4, name="Sevilla FC",         short_name="Sevilla",     league_code="laliga"),
]

# FIX: Added 'external_id' to satisfy Pydantic validation
MOCK_MATCHES = [
    Match(
        id=1,
        external_id=1001, # Required by updated Match schema
        league_code="laliga",
        home_team_id=1,   
        away_team_id=2,   
        kickoff_time=datetime(2026, 1, 20, 20, 0), # Synchronized for 2026
        venue="Olympic Stadium",
        round="Matchday 1",
    ),
    Match(
        id=2,
        external_id=1002,
        league_code="laliga",
        home_team_id=3,   
        away_team_id=1,   
        kickoff_time=datetime(2026, 1, 27, 20, 0),
        venue="Cívitas Metropolitano",
        round="Matchday 2",
    ),
    Match(
        id=3,
        external_id=1003,
        league_code="laliga",
        home_team_id=1,   
        away_team_id=4,   
        kickoff_time=datetime(2026, 2, 3, 20, 0),
        venue="Olympic Stadium",
        round="Matchday 3",
    ),
]


@router.get("/{team_id}/matches", response_model=list[Match])
def list_matches_for_team(
    team_id: int,
    session: Session = Depends(get_session),
):
    """Return all matches where this team is home or away, from the DB."""
    matches = session.exec(
        select(MatchDB).where(
            (MatchDB.home_team_id == team_id)
            | (MatchDB.away_team_id == team_id)
        )
    ).all()

    if not matches:
        # If DB is empty, we don't crash; we return 404
        raise HTTPException(status_code=404, detail="No matches found for this team")

    return matches