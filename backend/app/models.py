from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlmodel import SQLModel, Field, JSON, Column


# ---------------------------------------------------------------------------
# Tactical Predictions — React / JSON API interface
# ---------------------------------------------------------------------------

class MatchPrediction(SQLModel, table=True):
    """
    Stores a user's tactical lineup and slider settings submitted from the
    React PitchBoard frontend.

    lineup_data  : dict mapping pitch position (e.g. "ST") to player info.
                   Stored as JSON because the exact set of keys varies by
                   formation — a 4-3-3 has different slots to a 3-5-2.
    tactics_data : dict with mentality, lineHeight, and width slider values
                   (each 0–100).  Also JSON for the same flexibility reason.
    status       : "LOCKED" when saved; changes to "SCORED" after the real
                   match result is available and scoring has run.
    """
    id: Optional[int] = Field(default=None, primary_key=True)

    # Foreign key to User.id — nullable until JWT auth is wired up (Milestone 3)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    match_id: int = Field(index=True)
    team_name: Optional[str] = None

    # JSON columns: SQLite stores these as TEXT; SQLModel deserialises them back
    # to dicts automatically when the row is read.
    lineup_data: Dict = Field(default_factory=dict, sa_type=JSON)
    tactics_data: Dict = Field(default_factory=dict, sa_type=JSON)

    # Core match outcome predictions
    match_result: Optional[str] = None          # "home" | "draw" | "away"
    btts_prediction: Optional[bool] = None      # Both Teams To Score
    correct_score: Optional[Dict] = Field(default=None, sa_type=JSON)   # {"home": 2, "away": 1}
    over_under: Optional[Dict] = Field(default=None, sa_type=JSON)      # {"line": 2.5, "pick": "over"}
    ht_ft: Optional[Dict] = Field(default=None, sa_type=JSON)           # {"ht": "home", "ft": "draw"}
    player_predictions: Optional[Dict] = Field(default=None, sa_type=JSON)
    # Stores: { first_goalscorer, anytime_goalscorer, player_assist,
    #           player_carded, shots_on_target, man_of_the_match }

    status: str = Field(default="LOCKED")
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# User & Security
# ---------------------------------------------------------------------------

class User(SQLModel, table=True):
    """
    Core user account.  hashed_password stores only the bcrypt hash — the
    plain-text password is never persisted anywhere in the system.
    football_iq_points and rank_title are updated by the scoring engine after
    each match, not by the user directly.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    email: str = Field(unique=True)
    hashed_password: str          # bcrypt hash, never the raw password
    country_allegiance: str
    football_iq_points: int = Field(default=0)
    rank_title: str = Field(default="Scout")
    google_id: Optional[str] = Field(default=None, index=True)
    display_name: Optional[str] = None
    avatar_id: Optional[str] = None
    favorite_nation: Optional[str] = None
    favorite_club: Optional[str] = None
    preferred_formation: Optional[str] = None
    tactical_style: Optional[str] = None
    wc_winner_pick: Optional[str] = None
    top_scorer_pick: Optional[str] = None
    biggest_upset_pick: Optional[str] = None
    onboarding_complete: bool = Field(default=False)
    is_admin: bool = Field(default=False)


# ---------------------------------------------------------------------------
# World Cup Reference Data
# ---------------------------------------------------------------------------

class Player(SQLModel, table=True):
    """
    A player synced from the external football API.
    external_id is the API provider's ID (unique constraint prevents duplicate
    rows if sync_api_data() is called more than once).
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    external_id: int = Field(unique=True, index=True)
    name: str
    position: str
    country: str
    team_id: int


class TeamDB(SQLModel, table=True):
    """
    A national team or club.  external_id maps to the API provider's team ID.
    league_code groups teams by competition (e.g. "worldcup", "laliga").
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    external_id: int = Field(unique=True, index=True)
    name: str
    short_name: str
    league_code: str = Field(default="worldcup", index=True)


class MatchDB(SQLModel, table=True):
    """
    A scheduled or completed match.
    home_team_id / away_team_id reference TeamDB.id (not external_id).
    status transitions: "scheduled" -> "live" -> "finished".
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    external_id: int = Field(unique=True, index=True)
    home_team_id: int
    away_team_id: int
    kickoff_time: datetime
    venue: str
    round: str
    status: str = Field(default="scheduled")
    home_goals: Optional[int] = None
    away_goals: Optional[int] = None
    ht_home_goals: Optional[int] = None
    ht_away_goals: Optional[int] = None


# ---------------------------------------------------------------------------
# HTML Interface Predictions — Jinja2 / web.py interface
# ---------------------------------------------------------------------------

class PredictionDB(SQLModel, table=True):
    """
    Stores predictions submitted via the Jinja2 HTML form interface (web.py).

    This is intentionally separate from MatchPrediction (the React/JSON API
    model) because the two interfaces have different data shapes:
    - MatchPrediction uses JSON blobs for dynamic formation-aware lineups.
    - PredictionDB uses a simple pipe-separated string (players_csv) and a
      plain formation text field, matching the HTML <textarea> form input.

    players_csv example: "L. Messi|A. Di Maria|R. De Paul|..." (11 names)
    The pipe separator is chosen because player names can contain commas.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True)   # submitted via HTML form, no auth yet
    team_id: int
    match_id: int = Field(index=True)
    formation: str                       # e.g. "4-3-3"
    players_csv: str                     # pipe-separated player names
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Squad Caching — API Quota Protection
# ---------------------------------------------------------------------------

class PasswordResetToken(SQLModel, table=True):
    """
    Single-use, time-limited token for password reset flows.
    Generated when a user requests /auth/forgot-password.
    Invalidated (used=True) immediately after /auth/reset-password succeeds.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    token: str = Field(unique=True, index=True)   # secrets.token_urlsafe(32)
    expires_at: datetime                           # utcnow + 1 hour
    used: bool = Field(default=False)


class AiCommentary(SQLModel, table=True):
    """
    AI tactical commentary generated every 10 minutes during live matches.
    Stored so clients connecting mid-match can fetch recent commentary immediately.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    match_id: int = Field(index=True)
    minute: Optional[int] = None
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TeamSquadCache(SQLModel, table=True):
    """
    Cache for Squad Data.
    Prevents redundant API calls and saves your daily quota.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    team_name: str = Field(index=True, unique=True)
    players_data: Dict[str, Any] = Field(default={}, sa_column=Column(JSON))
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime  # Time-based expiration
