from typing import Iterator
from sqlmodel import SQLModel, create_engine, Session, select

# ---------------------------------------------------------------------------
# Engine configuration
# ---------------------------------------------------------------------------

sqlite_file_name = "fanxi.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

# echo=False prevents SQLAlchemy from printing every SQL statement to stdout.
# Set echo=True temporarily when debugging query issues, but never in production
# because SQL logs can expose sensitive data (e.g. hashed passwords in INSERT).
engine = create_engine(sqlite_url, echo=False)


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

def init_db() -> None:
    """
    Create all database tables if they do not already exist.

    We import every model class here so SQLModel's metadata registry is
    populated before create_all() runs.  If a model is never imported,
    its table will not be created.

    This function is idempotent — safe to call on every server startup.
    """
    # All table-backed models must be imported before create_all()
    from app.models import User, Player, MatchPrediction, PredictionDB, TeamDB, MatchDB  # noqa: F401

    SQLModel.metadata.create_all(engine)


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
