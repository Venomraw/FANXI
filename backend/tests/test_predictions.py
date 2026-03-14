"""
Critical-path tests: prediction create, update, lock, history, leaderboard.
"""
from fastapi.testclient import TestClient


SAMPLE_PREDICTION = {
    "lineup": {
        "GK":  {"name": "E. Martinez", "number": 23},
        "RB":  {"name": "N. Molina", "number": 26},
        "CB1": {"name": "C. Romero", "number": 13},
        "CB2": {"name": "N. Otamendi", "number": 19},
        "LB":  {"name": "N. Tagliafico", "number": 3},
        "CM1": {"name": "R. De Paul", "number": 7},
        "CM2": {"name": "E. Fernandez", "number": 24},
        "CM3": {"name": "L. Paredes", "number": 5},
        "RW":  {"name": "A. Di Maria", "number": 11},
        "ST":  {"name": "L. Messi", "number": 10},
        "LW":  {"name": "J. Alvarez", "number": 9},
    },
    "tactics": {"mentality": 60, "lineHeight": 55, "width": 50},
    "formation": "4-3-3",
    "team_name": "Argentina",
    "timestamp": "2026-06-11T13:00:00Z",
    "status": "LOCKED",
    "outcomes": {
        "match_result": "home",
        "btts": True,
        "correct_score": {"home": 2, "away": 1},
        "over_under": {"line": 2.5, "pick": "over"},
        "ht_ft": {"ht": "home", "ft": "home"},
    },
    "player_predictions": {
        "first_goalscorer": "L. Messi",
        "anytime_goalscorer": "J. Alvarez",
    },
}


def test_create_prediction(client: TestClient, auth_headers):
    res = client.post("/predictions/lock/1001", json=SAMPLE_PREDICTION, headers=auth_headers)
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "success"
    assert "prediction_id" in data


def test_create_prediction_unauthenticated(client: TestClient):
    res = client.post("/predictions/lock/1001", json=SAMPLE_PREDICTION)
    assert res.status_code == 401


def test_update_prediction_upsert(client: TestClient, auth_headers):
    """Submitting twice for the same match should update, not duplicate."""
    res1 = client.post("/predictions/lock/1002", json=SAMPLE_PREDICTION, headers=auth_headers)
    assert res1.status_code == 201
    id1 = res1.json()["prediction_id"]

    # Update with different result
    updated = {**SAMPLE_PREDICTION, "outcomes": {**SAMPLE_PREDICTION["outcomes"], "match_result": "away"}}
    res2 = client.post("/predictions/lock/1002", json=updated, headers=auth_headers)
    assert res2.status_code == 201
    id2 = res2.json()["prediction_id"]

    # Same prediction row should be updated (same ID)
    assert id1 == id2


def test_get_prediction_history(client: TestClient, auth_headers, registered_user):
    _, _, user_data = registered_user

    # Create a prediction first
    client.post("/predictions/lock/1003", json=SAMPLE_PREDICTION, headers=auth_headers)

    res = client.get(f"/predictions/history/{user_data['id']}", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    assert data[0]["match_id"] == 1003


def test_leaderboard_returns_list(client: TestClient, registered_user):
    res = client.get("/predictions/leaderboard")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert data[0]["username"] == "testscout"


def test_leaderboard_shape(client: TestClient, registered_user):
    res = client.get("/predictions/leaderboard")
    entry = res.json()[0]
    assert "rank" in entry
    assert "username" in entry
    assert "football_iq_points" in entry
    assert "rank_title" in entry
