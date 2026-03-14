"""
Shared test fixtures for FanXI backend.

Uses an in-memory SQLite database so tests are fast, isolated, and
don't touch the real database.
"""
import pytest
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine
from sqlmodel.pool import StaticPool

from app.main import app
from app.db import get_session


@pytest.fixture(name="session")
def session_fixture():
    """Create a fresh in-memory database for each test."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session):
    """TestClient that uses the in-memory session and disables rate limiting."""
    def get_session_override():
        yield session

    app.dependency_overrides[get_session] = get_session_override

    # Disable rate limiting in tests — slowapi uses app.state.limiter
    from app.limiter import limiter
    limiter.enabled = False

    client = TestClient(app)
    yield client

    limiter.enabled = True
    app.dependency_overrides.clear()


@pytest.fixture(name="registered_user")
def registered_user_fixture(client: TestClient):
    """Register a test user and return (username, password, user_data)."""
    username = "testscout"
    password = "TestPass123!"
    res = client.post("/register", json={
        "username": username,
        "email": "testscout@fanxi-test.com",
        "password": password,
        "country_allegiance": "Argentina",
    })
    assert res.status_code == 201
    return username, password, res.json()


@pytest.fixture(name="auth_token")
def auth_token_fixture(client: TestClient, registered_user):
    """Login and return the access token."""
    username, password, _ = registered_user
    res = client.post("/login", data={
        "username": username,
        "password": password,
    })
    assert res.status_code == 200
    return res.json()["access_token"]


@pytest.fixture(name="auth_headers")
def auth_headers_fixture(auth_token: str):
    """Return Authorization headers dict."""
    return {"Authorization": f"Bearer {auth_token}"}
