from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class PredictionDB(SQLModel, table=True):
    """
    Stores fan lineup predictions.
    """
    id: Optional[int] = Field(default=None, primary_key=True)

    username: str
    team_id: int
    match_id: int
    formation: str

    # XI stored as a single string (pipe-separated / newline-joined)
    players_csv: str = Field(description="XI players as a single string")

    created_at: datetime = Field(default_factory=datetime.utcnow)


class TeamDB(SQLModel, table=True):
    """
    Stores teams (e.g., La Liga clubs).
    """
    id: Optional[int] = Field(default=None, primary_key=True)

    name: str
    short_name: str
    league_code: str = Field(index=True)


class MatchDB(SQLModel, table=True):
    """
    Stores fixtures / matches.
    """
    id: Optional[int] = Field(default=None, primary_key=True)

    league_code: str = Field(index=True)

    home_team_id: int
    away_team_id: int

    kickoff_time: datetime
    venue: str
    round: str

    status: str = Field(default="scheduled")
