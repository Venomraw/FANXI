import re
from datetime import datetime
from pydantic import BaseModel, validator

USERNAME_RE = re.compile(r"^[a-zA-Z0-9_]{3,20}$")


class League(BaseModel):
    code: str
    name: str


class Team(BaseModel):
    id: int
    name: str
    short_name: str
    league_code: str


class Match(BaseModel):
    id: int
    league_code: str
    home_team_id: int
    away_team_id: int
    kickoff_time: datetime
    venue: str | None = None
    round: str | None = None
    status: str = "scheduled"


class PredictionInput(BaseModel):
    """What a fan sends when submitting a lineup prediction."""
    username: str
    team_id: int
    match_id: int
    formation: str
    players: list[str]

    # 🔴 THIS is the username rule that will now be enforced
    @validator("username")
    def validate_username(cls, v: str) -> str:
        v = v.strip()
        if not USERNAME_RE.match(v):
            raise ValueError(
                "Username must be 3–20 characters, using only letters, numbers, or underscore."
            )
        # normalize to lowercase so "Binamra" and "binamra" are same user
        return v.lower()


class Prediction(BaseModel):
    id: int
    username: str
    team_id: int
    match_id: int
    formation: str
    players: list[str]
    created_at: datetime


class PredictionScore(BaseModel):
    prediction_id: int
    match_id: int
    username: str
    correct_players: int
    total_players: int = 11
    score: int


class MatchSummary(BaseModel):
    match_id: int
    total_predictions: int
    unique_users: int
    best_score: int
    average_score: float
