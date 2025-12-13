from sqlmodel import SQLModel, create_engine, Session

# When you run `uvicorn app.main:app` from the backend folder,
# this will create fanxi.db inside backend/
DATABASE_URL = "sqlite:///./fanxi.db"

engine = create_engine(
    DATABASE_URL,
    echo=False,  # set to True if you want to see raw SQL in the logs
)


def create_db_and_tables() -> None:
    """
    Import models and create all database tables.
    Call this once at startup.
    """
    # Import here so models are registered before create_all
    from app import models  # noqa: F401

    SQLModel.metadata.create_all(engine)


def get_session():
    """
    FastAPI dependency: yields a database session.
    We'll start using this in the prediction endpoints later.
    """
    with Session(engine) as session:
        yield session
