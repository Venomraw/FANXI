from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class PredictionDB(SQLModel, table=True):
    """
    Database model for storing predictions in SQLite.
    """
    id: Optional[int] = Field(default=None, primary_key=True)

    username: str
    team_id: int
    match_id: int
    formation: str

    # Store players as a single string for now (e.g. "P1|P2|P3|...")
    players_csv: str = Field(description="XI players as a pipe-separated string")

    created_at: datetime = Field(default_factory=datetime.utcnow)
