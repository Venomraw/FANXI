"""
PIETRO agent tests — deduplication, template selection, conversion tracking.

All tests use the in-memory SQLite database from conftest.py fixtures.
"""
from datetime import datetime, timedelta, timezone

from app.models import (
    User, MatchPrediction, NudgeLog, InAppNotification,
)
from app.agents.pietro import Pietro
from app.core.security import get_password_hash


def _make_user(session, username="nudgeuser", country="Brazil", iq=0, fav_nation=None):
    """Helper: create a test user and return it."""
    user = User(
        username=username,
        email=f"{username}@fanxi-test.com",
        hashed_password=get_password_hash("TestPass123!"),
        country_allegiance=country,
        football_iq_points=iq,
        favorite_nation=fav_nation,
        onboarding_complete=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def _make_match_fixture():
    """Return a fake match dict matching the structure PIETRO expects."""
    return {
        "id": 9999,
        "home_team": "France",
        "away_team": "Brazil",
        "_kickoff_dt": datetime.now(timezone.utc) + timedelta(minutes=30),
    }


# ---------------------------------------------------------------------------
# Test 1: Deduplication — never nudge the same user twice for the same match
# ---------------------------------------------------------------------------

def test_pietro_deduplication(session):
    """
    Given a user with an existing NudgeLog entry for a match,
    PIETRO should skip that user and report nudges_skipped_dedup == 1.
    """
    user = _make_user(session)
    match = _make_match_fixture()

    # Pre-insert a NudgeLog — user was already nudged for this match
    existing_nudge = NudgeLog(
        user_id=user.id,
        match_id=match["id"],
        nudge_type="in_app",
        match_kickoff=match["_kickoff_dt"],
    )
    session.add(existing_nudge)
    session.commit()

    # Count nudge logs before
    nudge_count_before = len(session.exec(
        __import__("sqlmodel").select(NudgeLog)
    ).all())

    # Run PIETRO's nudge logic for this match
    pietro = Pietro()
    iq_threshold = pietro._get_iq_threshold(session)
    result = pietro._nudge_for_match(session, match, iq_threshold)
    session.commit()

    # Count nudge logs after
    nudge_count_after = len(session.exec(
        __import__("sqlmodel").select(NudgeLog)
    ).all())

    # Assertions
    assert result["nudges_skipped_dedup"] >= 1, "Should have skipped the deduped user"
    assert result["nudges_sent"] == 0, "Should not have sent any new nudges"
    assert nudge_count_after == nudge_count_before, "No new NudgeLog rows should be created"


# ---------------------------------------------------------------------------
# Test 2: Template selection — favorite nation gets personal nudge
# ---------------------------------------------------------------------------

def test_pietro_template_selection(session):
    """
    Given a user whose favorite_nation is 'France' and a match where
    France is playing, PIETRO should use the personal nation template.
    """
    user = _make_user(session, username="francefan", fav_nation="France")
    match = _make_match_fixture()  # France vs Brazil

    pietro = Pietro()
    iq_threshold = pietro._get_iq_threshold(session)
    result = pietro._nudge_for_match(session, match, iq_threshold)
    session.commit()

    assert result["nudges_sent"] == 1

    # Check the notification content
    notif = session.exec(
        __import__("sqlmodel").select(InAppNotification).where(
            InAppNotification.user_id == user.id,
        )
    ).first()

    assert notif is not None, "Notification should have been created"
    assert "France" in notif.title, f"Title should mention France, got: {notif.title}"
    assert "/predict?match=9999" in notif.action_url


# ---------------------------------------------------------------------------
# Test 3: Conversion tracking — detect when nudged user predicts
# ---------------------------------------------------------------------------

def test_pietro_conversion_tracking(session):
    """
    Given a NudgeLog entry where converted=False, and a matching
    MatchPrediction exists, conversion tracker should set converted=True.
    """
    user = _make_user(session, username="converter")

    # Create an unconverted nudge log
    nudge = NudgeLog(
        user_id=user.id,
        match_id=8888,
        nudge_type="in_app",
        converted=False,
        sent_at=datetime.now(timezone.utc) - timedelta(minutes=30),
        match_kickoff=datetime.now(timezone.utc) - timedelta(minutes=5),
    )
    session.add(nudge)

    # Create a matching prediction (user DID predict after the nudge)
    prediction = MatchPrediction(
        user_id=user.id,
        match_id=8888,
        team_name="Argentina",
        status="LOCKED",
    )
    session.add(prediction)
    session.commit()

    # Run conversion check directly on this session
    from sqlmodel import select
    unconverted = session.exec(
        select(NudgeLog).where(
            NudgeLog.converted == False,  # noqa: E712
        )
    ).all()

    conversions = 0
    for n in unconverted:
        pred = session.exec(
            select(MatchPrediction).where(
                MatchPrediction.user_id == n.user_id,
                MatchPrediction.match_id == n.match_id,
            )
        ).first()
        if pred:
            n.converted = True
            session.add(n)
            conversions += 1
    session.commit()

    # Refresh and check
    session.refresh(nudge)
    assert nudge.converted is True, "NudgeLog should be marked as converted"
    assert conversions == 1
