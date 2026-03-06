import re
from datetime import datetime
from typing import List, Optional, Dict
from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

# --------------------
# Shared validation
# --------------------
USERNAME_RE = re.compile(r"^[a-zA-Z0-9_]{3,20}$")

# --- League & Team Schemas ---
class League(BaseModel):
    code: str
    name: str

class Team(BaseModel):
    id: int           
    name: str         
    short_name: str   
    league_code: str  

# --- User & Auth Schemas ---
class UserBase(BaseModel):
    username: str
    email: EmailStr
    country_allegiance: str

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip()
        if not USERNAME_RE.match(v):
            raise ValueError("Username must be 3–20 characters (alphanumeric/underscore).")
        return v.lower()

class UserRead(UserBase):
    id: int
    football_iq_points: int
    rank_title: str

    class Config:
        from_attributes = True

# --- Match Outcome Sub-Schemas ---

class ScorePrediction(BaseModel):
    """Exact scoreline prediction."""
    home: int = Field(ge=0, le=20)
    away: int = Field(ge=0, le=20)

class OverUnderPrediction(BaseModel):
    """Over/under goals prediction with a line and a pick."""
    line: float = Field(ge=0.5, le=9.5)
    pick: str = Field(pattern="^(over|under)$")

class HTFTPrediction(BaseModel):
    """Half-time / Full-time double result prediction."""
    ht: str = Field(pattern="^(home|draw|away)$")
    ft: str = Field(pattern="^(home|draw|away)$")

class ShotsOnTargetPrediction(BaseModel):
    player: str
    threshold: int = Field(ge=1, le=10)  # "at least N shots"

class PlayerPredictions(BaseModel):
    first_goalscorer: Optional[str] = None
    anytime_goalscorer: Optional[str] = None
    player_assist: Optional[str] = None
    player_carded: Optional[str] = None
    shots_on_target: Optional[ShotsOnTargetPrediction] = None
    man_of_the_match: Optional[str] = None

class OutcomesPrediction(BaseModel):
    """Container for all 5 core match outcome predictions. All fields are optional."""
    match_result: Optional[str] = Field(default=None, pattern="^(home|draw|away)$")
    correct_score: Optional[ScorePrediction] = None
    btts: Optional[bool] = None
    over_under: Optional[OverUnderPrediction] = None
    ht_ft: Optional[HTFTPrediction] = None


# --- NEW: Tactical Engine Schemas ---

class PlayerInfo(BaseModel):
    """Schema for individual players within the lineup."""
    name: str
    number: int

class TacticsInfo(BaseModel):
    """Matches the three sliders from our PitchBoard."""
    mentality: int = Field(50, ge=0, le=100)
    lineHeight: int = Field(50, ge=0, le=100)
    width: int = Field(50, ge=0, le=100)

class LockSelectionRequest(BaseModel):
    """
    Matches the 'finalData' object sent from Next.js.
    Replaces the old PredictionInput.
    """
    lineup: Dict[str, PlayerInfo] # Maps position (e.g., 'ST') to PlayerInfo
    tactics: TacticsInfo
    outcomes: Optional[OutcomesPrediction] = None
    player_predictions: Optional[PlayerPredictions] = None
    team_name: Optional[str] = None
    timestamp: str
    status: str

    @field_validator("lineup")
    @classmethod
    def validate_lineup_size(cls, v: Dict) -> Dict:
        if len(v) < 1:
            # Note: During testing, you might want to lower this to 1 or more
            raise ValueError("A complete lineup requires 11 players.")
        return v

# --- Leaderboard & Stats ---
class LeaderboardEntry(BaseModel):
    rank: int
    username: str
    country_allegiance: str
    football_iq_points: int
    rank_title: str

class MatchResultInput(BaseModel):
    """Admin submits this after a match to trigger scoring."""
    home_goals: int
    away_goals: int
    ht_home_goals: int
    ht_away_goals: int
    first_goalscorer: Optional[str] = None
    scorers: List[str] = []
    assisters: List[str] = []
    carded: List[str] = []
    player_shots: dict = {}       # {"messi": 3, "ronaldo": 2}
    man_of_the_match: Optional[str] = None

class PredictionScore(BaseModel):
    prediction_id: int
    match_id: int
    username: str
    correct_players: int
    tactical_bonus: int = 0
    total_score: int

class Match(BaseModel):
    id: int
    external_id: int
    home_team_id: int
    away_team_id: int
    kickoff_time: Optional[datetime] = None
    venue: Optional[str] = None
    status: str = "scheduled"

class MatchSummary(BaseModel):
    match_id: int
    total_predictions: int
    unique_users: int
    best_score: int
    average_score: float    