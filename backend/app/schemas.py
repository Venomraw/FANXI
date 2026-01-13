import re
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator

# --------------------
# Shared validation
# --------------------
USERNAME_RE = re.compile(r"^[a-zA-Z0-9_]{3,20}$")

# --- League & Team Schemas (Restored to fix ImportError) ---
class League(BaseModel):
    """Schema for league data."""
    code: str         # e.g. "worldcup"
    name: str         # e.g. "FIFA World Cup 2026"

class Team(BaseModel):
    """Schema for team data."""
    id: int           
    name: str         
    short_name: str   
    league_code: str  

# --- User & Auth Schemas ---
class UserBase(BaseModel):
    """Base fields for a user."""
    username: str
    email: EmailStr
    country_allegiance: str

class UserCreate(UserBase):
    """What is required to register a new Scout."""
    password: str = Field(..., min_length=8)

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip()
        if not USERNAME_RE.match(v):
            raise ValueError("Username must be 3–20 characters (alphanumeric/underscore).")
        return v.lower()

class UserRead(UserBase):
    """Public profile data returned by the API."""
    id: int
    football_iq_points: int
    rank_title: str

    class Config:
        from_attributes = True

# --- Prediction Schemas (The Tactical Engine) ---
class PredictionInput(BaseModel):
    """JSON payload for submitting tactical lineups."""
    user_id: int
    team_id: int
    formation: str = "4-3-3"
    mentality: str = "Balanced" 
    pressing_intensity: int = Field(50, ge=0, le=100) # 0-100 constraint
    players: List[str]

    @field_validator("players")
    @classmethod
    def validate_players(cls, v: List[str]) -> List[str]:
        cleaned = [p.strip() for p in v if p.strip()]
        if len(cleaned) != 11:
            raise ValueError("A full squad requires exactly 11 players.")
        return cleaned

class PredictionScore(BaseModel):
    """Leaderboard entry showing tactical accuracy."""
    prediction_id: int
    match_id: int
    username: str
    correct_players: int
    tactical_bonus: int = 0 
    total_score: int

# --- Match Schemas ---
class Match(BaseModel):
    """World Cup fixture data."""
    id: int
    external_id: int
    home_team_id: int
    away_team_id: int
    kickoff_time: Optional[datetime] = None
    venue: Optional[str] = None
    status: str = "scheduled"

class MatchSummary(BaseModel):
    """Aggregated stats for the global map."""
    match_id: int
    total_predictions: int
    unique_users: int
    best_score: int
    average_score: float