from typing import Iterator
from sqlmodel import SQLModel, create_engine, Session, select

# 1. Database Configuration
sqlite_file_name = "fanxi.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

# echo=False for production to avoid leaking sensitive SQL logs
engine = create_engine(sqlite_url, echo=False)

def get_session() -> Iterator[Session]:
    """FastAPI dependency to get a DB session."""
    with Session(engine) as session:
        yield session

def init_db() -> None:
    """
    Initializes the database and tables. 
    Seed logic is now moved to a separate sync service to keep db.py clean.
    """
    from app.models import User, Player, MatchPrediction # Standardized models
    
    # Create all tables if they don't exist
    SQLModel.metadata.create_all(engine)

def sync_api_data() -> None:
    """
    The 'Scout' Bridge: Fetches real World Cup data and saves it.
    Call this from your main.py or a background task.
    """
    from app.models import Player
    from app.services.football_api import fetch_world_cup_squads # Your new service

    api_players = fetch_world_cup_squads()

    with Session(engine) as session:
        for p_data in api_players:
            # Idempotency Check: Prevents duplicate players
            statement = select(Player).where(Player.external_id == p_data["external_id"])
            existing_player = session.exec(statement).first()

            if not existing_player:
                new_player = Player(
                    name=p_data["name"],
                    country="TBD", # Mapping logic can be added later
                    position=p_data["position"],
                    external_id=p_data["external_id"]
                )
                session.add(new_player)
        
        session.commit()
        print(f"Log: Synced {len(api_players)} World Cup players successfully.")