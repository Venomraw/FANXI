from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field

# --- User & Security ---
class User(SQLModel, table=True):
    """
    Stores registered 'Scouts' and their security credentials.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    email: str = Field(unique=True)
    hashed_password: str # Never store plain text!
    country_allegiance: str 
    football_iq_points: int = Field(default=0)
    rank_title: str = Field(default="Scout") # Every legend starts here

# --- Tactical Predictions ---
class MatchPrediction(SQLModel, table=True):
    """
    Stores tactical lineup predictions with sliders.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id") # Link to User
    
    match_id: int = Field(index=True)
    team_id: int
    
    # Sliders and Tactics
    formation: str = Field(default="4-3-3")
    mentality: str = Field(default="Balanced") # e.g., Defensive, Attacking
    pressing_intensity: int = Field(default=50) # 0 to 100 slider
    
    # The Squad
    players_csv: str = Field(description="XI players separated by |")
    created_at: datetime = Field(default_factory=datetime.utcnow)

# --- World Cup Data ---
class Player(SQLModel, table=True):
    """
    Stores players fetched from the Football API.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    external_id: int = Field(unique=True, index=True) # API-Football ID
    name: str
    position: str
    country: str
    team_id: int

class TeamDB(SQLModel, table=True):
    """
    Stores national teams.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    external_id: int = Field(unique=True, index=True)
    name: str
    short_name: str
    league_code: str = Field(default="worldcup", index=True)

class MatchDB(SQLModel, table=True):
    """
    Stores World Cup fixtures.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    external_id: int = Field(unique=True, index=True)
    home_team_id: int
    away_team_id: int
    kickoff_time: datetime
    venue: str
    round: str # e.g., 'Group Stage' or 'Final'
    status: str = Field(default="scheduled")