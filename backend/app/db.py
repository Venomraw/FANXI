from typing import Iterator
from sqlalchemy import text
from sqlmodel import SQLModel, create_engine, Session, select
from app.config import settings

# ---------------------------------------------------------------------------
# Engine configuration
# ---------------------------------------------------------------------------

def get_engine():
    db_url = settings.database_url
    if db_url and "postgresql" in db_url:
        # PostgreSQL (Neon) — SSL handled via the connection string params
        return create_engine(db_url, echo=False)
    else:
        # SQLite fallback for local dev
        sqlite_url = "sqlite:///fanxi.db"
        return create_engine(
            sqlite_url, echo=False, connect_args={"check_same_thread": False}
        )

engine = get_engine()


# ---------------------------------------------------------------------------
# Session dependency
# ---------------------------------------------------------------------------

def get_session() -> Iterator[Session]:
    """
    FastAPI dependency that provides a database session per request.

    Using a context manager (with Session(...) as session) ensures the session
    is always closed and connections are returned to the pool, even if the
    request handler raises an exception.

    Usage in a route:
        def my_route(session: Session = Depends(get_session)): ...
    """
    with Session(engine) as session:
        yield session


# ---------------------------------------------------------------------------
# Initialisation
# ---------------------------------------------------------------------------

def run_migrations() -> None:
    """
    Add new columns to existing tables without dropping data.

    Uses an existence check before ALTER TABLE so this is safe to call on
    every startup on both SQLite and PostgreSQL. PostgreSQL aborts the whole
    transaction on a duplicate-column error, so we must avoid the error
    rather than catch it.
    """
    new_columns = [
        # MatchPrediction — 5 core outcome prediction fields
        ("matchprediction", "match_result",       "TEXT"),
        ("matchprediction", "btts_prediction",    "INTEGER"),
        ("matchprediction", "correct_score",      "JSON"),
        ("matchprediction", "over_under",         "JSON"),
        ("matchprediction", "ht_ft",              "JSON"),
        ("matchprediction", "player_predictions", "JSON"),
        # MatchDB — real result columns for scoring
        ("matchdb", "home_goals",    "INTEGER"),
        ("matchdb", "away_goals",    "INTEGER"),
        ("matchdb", "ht_home_goals", "INTEGER"),
        ("matchdb", "ht_away_goals", "INTEGER"),
    ]
    is_pg = "postgresql" in (settings.database_url or "")
    with engine.connect() as conn:
        for table, col, col_type in new_columns:
            if is_pg:
                exists = conn.execute(text(
                    "SELECT 1 FROM information_schema.columns "
                    "WHERE table_name = :t AND column_name = :c"
                ), {"t": table, "c": col}).fetchone()
            else:
                # SQLite: PRAGMA table_info
                rows = conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
                exists = any(row[1] == col for row in rows)

            if not exists:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}"))
                conn.commit()


def init_db() -> None:
    """
    Create all database tables if they do not already exist, then run
    any pending column migrations.

    We import every model class here so SQLModel's metadata registry is
    populated before create_all() runs.  If a model is never imported,
    its table will not be created.

    This function is idempotent — safe to call on every server startup.
    """
    # All table-backed models must be imported before create_all()
    from app.models import (  # noqa: F401
        User, Player, MatchPrediction, PredictionDB,
        TeamDB, MatchDB, TeamSquadCache, PasswordResetToken,
    )

    SQLModel.metadata.create_all(engine)
    run_migrations()


# ---------------------------------------------------------------------------
# Data sync (called manually or from a background task)
# ---------------------------------------------------------------------------

def sync_api_data() -> None:
    """
    Fetch real World Cup squads from the external football API and persist
    them to the local Player table.

    Uses an idempotency check (select by external_id) so calling this
    function multiple times will not create duplicate player rows.

    Call this once after the World Cup squad lists are finalised, or wire
    it into a scheduled background task for periodic refreshes.
    """
    from app.models import Player
    from app.services.football_api import fetch_world_cup_squads

    api_players = fetch_world_cup_squads()

    with Session(engine) as session:
        for p_data in api_players:
            # Skip players that are already in the database
            existing = session.exec(
                select(Player).where(Player.external_id == p_data["external_id"])
            ).first()

            if not existing:
                new_player = Player(
                    name=p_data["name"],
                    country="TBD",  # country mapping can be added later
                    position=p_data["position"],
                    external_id=p_data["external_id"],
                )
                session.add(new_player)

        session.commit()
        print(f"Synced {len(api_players)} World Cup players successfully.")
