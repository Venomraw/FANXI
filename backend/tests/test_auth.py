"""
Critical-path tests: signup, login, token refresh, logout.
"""
from fastapi.testclient import TestClient


def test_register_new_user(client: TestClient):
    res = client.post("/register", json={
        "username": "newscout",
        "email": "new@fanxi-test.com",
        "password": "SecurePass1!",
        "country_allegiance": "Brazil",
    })
    assert res.status_code == 201
    data = res.json()
    assert data["username"] == "newscout"
    assert data["rank_title"] == "Scout"
    assert data["football_iq_points"] == 0


def test_register_duplicate_username(client: TestClient, registered_user):
    username, _, _ = registered_user
    res = client.post("/register", json={
        "username": username,
        "email": "different@fanxi-test.com",
        "password": "SecurePass1!",
        "country_allegiance": "Brazil",
    })
    assert res.status_code == 400


def test_register_short_password(client: TestClient):
    res = client.post("/register", json={
        "username": "shortpw",
        "email": "short@fanxi-test.com",
        "password": "abc",
        "country_allegiance": "Brazil",
    })
    assert res.status_code == 422


def test_login_success(client: TestClient, registered_user):
    username, password, _ = registered_user
    res = client.post("/login", data={"username": username, "password": password})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == username


def test_login_wrong_password(client: TestClient, registered_user):
    username, _, _ = registered_user
    res = client.post("/login", data={"username": username, "password": "WrongPass!"})
    assert res.status_code == 401


def test_login_nonexistent_user(client: TestClient):
    res = client.post("/login", data={"username": "ghost", "password": "Whatever1!"})
    assert res.status_code == 401


def test_me_with_valid_token(client: TestClient, auth_headers):
    res = client.get("/me", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["username"] == "testscout"


def test_me_without_token(client: TestClient):
    res = client.get("/me")
    assert res.status_code == 401


def test_me_with_invalid_token(client: TestClient):
    res = client.get("/me", headers={"Authorization": "Bearer garbage.token.here"})
    assert res.status_code == 401


def test_refresh_sets_cookie(client: TestClient, registered_user):
    username, password, _ = registered_user
    res = client.post("/login", data={"username": username, "password": password})
    assert res.status_code == 200
    # The TestClient stores cookies automatically
    assert "fanxi_refresh" in client.cookies or res.cookies.get("fanxi_refresh") is not None


def test_logout(client: TestClient, registered_user):
    username, password, _ = registered_user
    client.post("/login", data={"username": username, "password": password})
    res = client.post("/auth/logout")
    assert res.status_code == 204
