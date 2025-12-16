from typing import Iterator

from sqlmodel import SQLModel, create_engine, Session, select


sqlite_file_name = "fanxi.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

engine = create_engine(sqlite_url, echo=False)


def get_session() -> Iterator[Session]:
    """FastAPI dependency to get a DB session."""
    with Session(engine) as session:
        yield session


def init_db() -> None:
    """
    Create tables if they don't exist and seed initial teams/matches
    from the mock data (only if tables are empty).
    """
    from app.models import TeamDB, MatchDB, PredictionDB  # avoid circular imports

    # 🔹 Import the mock data INSIDE the function so there's no NameError
    from app.api.leagues import MOCK_TEAMS
    from app.api.teams import MOCK_MATCHES


    # Create all tables
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        # Seed teams from MOCK_TEAMS if table empty
        has_team = session.exec(select(TeamDB)).first()
        if has_team is None:
            for t in MOCK_TEAMS:
                # t is a Pydantic model; works in FastAPI v1/v2
                data = t.dict() if hasattr(t, "dict") else t.model_dump()
                session.add(TeamDB(**data))

        # Seed matches from MOCK_MATCHES if table empty
        has_match = session.exec(select(MatchDB)).first()
        if has_match is None:
            for m in MOCK_MATCHES:
                data = m.dict() if hasattr(m, "dict") else m.model_dump()
                session.add(MatchDB(**data))

        session.commit()
