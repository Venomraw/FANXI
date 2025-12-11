from datetime import datetime
from pydantic import BaseModel


class League(BaseModel):
    code: str         # e.g. "laliga"
    name: str         # e.g. "La Liga"


class Team(BaseModel):
    id: int           # internal ID for now
    name: str         # e.g. "FC Barcelona"
    short_name: str   # e.g. "Barcelona"
    league_code: str  # link back to League.code

class Match(BaseModel):
    id: int
    league_code: str      # e.g. "laliga"
    home_team_id: int
    away_team_id: int
    kickoff_time: datetime
    venue: str | None = None
    round: str | None = None   # e.g. "Matchday 12"
    status: str = "scheduled"  # scheduled, finished, live, etc.
