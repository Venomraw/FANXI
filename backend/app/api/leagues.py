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

from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select

from app.schemas import League, Team
from app.db import get_session
from app.models import TeamDB

router = APIRouter(
    prefix="/leagues",
    tags=["leagues"],
)

# --- Mock data (used for seeding + simple leagues list) ---

MOCK_LEAGUES = [
    League(code="laliga", name="La Liga"),
]

# Kept so init_db() can still seed the DB from this list
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
def list_teams_for_league(
    league_code: str,
    session: Session = Depends(get_session),
):
    """
    List teams for a given league code, now backed by the DB (TeamDB).
    MOCK_TEAMS is only used for initial seeding in init_db().
    """
    # sanity check: league must exist
    leagues = {league.code for league in MOCK_LEAGUES}
    if league_code not in leagues:
        raise HTTPException(status_code=404, detail="League not found")

    teams = session.exec(
        select(TeamDB).where(TeamDB.league_code == league_code)
    ).all()
    return teams

