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

class PredictionInput(BaseModel):
    """What a fan sends when submitting a lineup prediction."""
    username: str          # simple identity for now
    team_id: int
    match_id: int
    formation: str         # e.g. "4-3-3"
    players: list[str]     # list of 11 player names (for now just strings)


class Prediction(BaseModel):
    """Stored / returned prediction with metadata."""
    id: int
    username: str
    team_id: int
    match_id: int
    formation: str
    players: list[str]
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