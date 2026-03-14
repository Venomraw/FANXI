"""
Critical-path tests: key endpoints return expected shapes.
"""
from fastapi.testclient import TestClient


def test_health_endpoint(client: TestClient):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "timestamp" in data


def test_ready_endpoint(client: TestClient):
    """Readiness check — may return 503 in test since no real DB URL is set."""
    res = client.get("/ready")
    # Either 200 (ready) or 503 (not ready) is valid in test environment
    assert res.status_code in (200, 503)
    data = res.json()
    assert "status" in data


def test_matches_all(client: TestClient):
    res = client.get("/matches/all")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) == 72  # 12 groups x 6 matches


def test_matches_all_shape(client: TestClient):
    res = client.get("/matches/all")
    match = res.json()[0]
    assert "id" in match
    assert "home_team" in match
    assert "away_team" in match
    assert "kickoff" in match
    assert "venue" in match
    assert "group" in match


def test_squad_static(client: TestClient):
    res = client.get("/squad/Argentina")
    assert res.status_code == 200
    data = res.json()
    assert data["source"] == "static"
    assert len(data["players"]) == 23


def test_squad_case_insensitive(client: TestClient):
    res = client.get("/squad/argentina")
    assert res.status_code == 200
    assert res.json()["source"] == "static"


def test_squad_fallback(client: TestClient):
    """Unknown team should return fallback placeholders, not 404."""
    res = client.get("/squad/UnknownTeam123")
    assert res.status_code == 200
    data = res.json()
    assert data["source"] == "fallback"


def test_username_availability(client: TestClient, registered_user):
    username, _, _ = registered_user
    # Taken username
    res = client.get(f"/users/check/{username}")
    assert res.json()["available"] is False

    # Free username
    res = client.get("/users/check/nobodyhasthis")
    assert res.json()["available"] is True
