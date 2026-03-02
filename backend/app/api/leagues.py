from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select

from app.schemas import League, Team
from app.db import get_session
from app.models import TeamDB

router = APIRouter(
    prefix="/leagues",
    tags=["leagues"],
)

MOCK_LEAGUES = [
    League(code="laliga", name="La Liga"),
    League(code="worldcup", name="FIFA World Cup 2026"),
]

MOCK_TEAMS = [
    Team(id=1, name="FC Barcelona",       short_name="Barcelona",   league_code="laliga"),
    Team(id=2, name="Real Madrid CF",     short_name="Real Madrid", league_code="laliga"),
    Team(id=3, name="Atlético de Madrid", short_name="Atlético",    league_code="laliga"),
    Team(id=4, name="Sevilla FC",         short_name="Sevilla",     league_code="laliga"),
]


@router.get("/", response_model=list[League])
def list_leagues():
    return MOCK_LEAGUES


@router.get("/{league_code}/teams", response_model=list[Team])
def list_teams_for_league(
    league_code: str,
    session: Session = Depends(get_session),
):
    leagues = {league.code for league in MOCK_LEAGUES}
    if league_code not in leagues:
        raise HTTPException(status_code=404, detail="League not found")

    teams = session.exec(
        select(TeamDB).where(TeamDB.league_code == league_code)
    ).all()
    return teams
