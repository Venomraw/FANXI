import re
from datetime import datetime
from typing import List

from pydantic import BaseModel, field_validator


# --------------------
# Shared validation
# --------------------
USERNAME_RE = re.compile(r"^[a-zA-Z0-9_]{3,20}$")


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
    kickoff_time: datetime | None = None
    venue: str | None = None
    round: str | None = None   # e.g. "Matchday 12"
    status: str = "scheduled"  # scheduled, finished, live, etc.


class PredictionInput(BaseModel):
    """What a fan sends when submitting a lineup prediction (JSON API)."""
    username: str
    team_id: int
    match_id: int
    formation: str
    players: List[str]  # list of 11 player names

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip()
        if not USERNAME_RE.match(v):
            raise ValueError(
                "Username must be 3–20 characters, using only letters, numbers, or underscore."
            )
        return v.lower()

    @field_validator("players")
    @classmethod
    def validate_players(cls, v: List[str]) -> List[str]:
        cleaned = [p.strip() for p in v if p.strip()]
        if len(cleaned) != 11:
            raise ValueError("Prediction must contain exactly 11 non-empty player names.")
        return cleaned


class Prediction(BaseModel):
    """Stored / returned prediction with metadata."""
    id: int
    username: str
    team_id: int
    match_id: int
    formation: str
    players: List[str]
    created_at: datetime


class PredictionScore(BaseModel):
    """Result of comparing a prediction to the official lineup."""
    prediction_id: int
    match_id: int
    username: str
    correct_players: int
    total_players: int = 11
    score: int  # e.g. points, 1 per correct player for now


class MatchSummary(BaseModel):
    match_id: int
    total_predictions: int
    unique_users: int
    best_score: int
    average_score: float
