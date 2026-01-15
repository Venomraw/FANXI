from datetime import datetime
from typing import Optional, List, Dict  # Added Dict here
from sqlmodel import SQLModel, Field, JSON

# --- Tactical Predictions (The Core of FanXI) ---
class MatchPrediction(SQLModel, table=True):
    """
    Stores tactical lineup predictions, sliders, and match events.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    match_id: int = Field(index=True)
    
    # Modernized storage using JSON for our dynamic frontend
    # lineup_data stores the 11 players and their positions
    lineup_data: Dict = Field(default_factory=dict, sa_type=JSON) 
    
    # tactics_data stores mentality, line height, and width sliders
    tactics_data: Dict = Field(default_factory=dict, sa_type=JSON) 
    
    status: str = Field(default="LOCKED") # Becomes 'SCORED' after match
    created_at: datetime = Field(default_factory=datetime.utcnow)

# --- User & Security ---
class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    email: str = Field(unique=True)
    hashed_password: str 
    country_allegiance: str 
    football_iq_points: int = Field(default=0)
    rank_title: str = Field(default="Scout")

# --- World Cup Data ---
class Player(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    external_id: int = Field(unique=True, index=True)
    name: str
    position: str
    country: str
    team_id: int

class TeamDB(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    external_id: int = Field(unique=True, index=True)
    name: str
    short_name: str
    league_code: str = Field(default="worldcup", index=True)

class MatchDB(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    external_id: int = Field(unique=True, index=True)
    home_team_id: int
    away_team_id: int
    kickoff_time: datetime
    venue: str
    round: str 
    status: str = Field(default="scheduled")