import re
import secrets
import urllib.parse
from datetime import datetime, timedelta

import httpx
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlmodel import Session, select
from app.limiter import limiter

from app.db import get_session
from app.models import User, PasswordResetToken, AuthEvent
from app.schemas import UserCreate, UserRead, OnboardingUpdate
from app.core.security import (
    get_password_hash, verify_password,
    create_access_token, decode_access_token,
    create_refresh_token, decode_refresh_token,
)
from app.config import settings

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")


# ---------------------------------------------------------------------------
# Dependency: get current user from Bearer token
# ---------------------------------------------------------------------------

def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> User:
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    user = session.get(User, int(user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user


# ---------------------------------------------------------------------------
# Register
# ---------------------------------------------------------------------------

# 5/minute — prevents mass account creation and bot signups.
# Low ceiling because legitimate users register at most once.
@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register_user(request: Request, user_data: UserCreate, session: Session = Depends(get_session)):
    existing = session.exec(
        select(User).where(
            (User.username == user_data.username) | (User.email == user_data.email)
        )
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Username or email already registered")

    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        country_allegiance=user_data.country_allegiance,
        rank_title="Scout",
        onboarding_complete=True,  # manual registration skips onboarding
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    return new_user


# ---------------------------------------------------------------------------
# Login — returns JWT access token
# ---------------------------------------------------------------------------

# 10/minute — brute force protection. Generous enough for real users
# (a typo or two is fine) but blocks automated credential stuffing attacks.
@router.post("/login")
@limiter.limit("10/minute")
def login(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    user = session.exec(
        select(User).where(User.username == form_data.username)
    ).first()

    client_ip = request.client.host if request.client else "unknown"

    if not user or not verify_password(form_data.password, user.hashed_password):
        # Log failed attempt for NATASHA auth watchdog
        session.add(AuthEvent(
            user_id=user.id if user else None,
            event_type="login_failure",
            ip_address=client_ip,
            user_agent=request.headers.get("user-agent", ""),
            details=f"failed login for username={form_data.username}",
        ))
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    # Log successful login for NATASHA auth watchdog
    session.add(AuthEvent(
        user_id=user.id,
        event_type="login_success",
        ip_address=client_ip,
        user_agent=request.headers.get("user-agent", ""),
    ))
    session.commit()

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token(user.id)

    # httpOnly prevents JavaScript from reading this cookie, protecting against
    # XSS attacks. The token is sent automatically by the browser on requests
    # to the /auth/refresh endpoint only (path-scoped for minimal exposure).
    response.set_cookie(
        key="fanxi_refresh",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=60 * 60 * 24 * 7,  # 7 days in seconds
        path="/auth/refresh",       # cookie only sent to the refresh endpoint
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "country_allegiance": user.country_allegiance,
            "football_iq_points": user.football_iq_points,
            "rank_title": user.rank_title,
            "onboarding_complete": user.onboarding_complete,
            "display_name": user.display_name,
            "avatar_id": user.avatar_id,
            "favorite_nation": user.favorite_nation,
            "favorite_club": user.favorite_club,
            "preferred_formation": user.preferred_formation,
            "tactical_style": user.tactical_style,
            "is_admin": user.is_admin,
        },
    }


# ---------------------------------------------------------------------------
# Me — returns current logged-in user
# ---------------------------------------------------------------------------

# 60/minute — polled on page load for profile data.
# Generous for real use but blocks scrapers cycling through the endpoint.
@router.get("/me", response_model=UserRead)
@limiter.limit("60/minute")
def get_me(request: Request, current_user: User = Depends(get_current_user)):
    return current_user


# ---------------------------------------------------------------------------
# Refresh — issues a new access token using the httpOnly refresh cookie.
# Flow: browser sends fanxi_refresh cookie → decode → verify user exists
# → return new short-lived access token. No credentials needed.
# ---------------------------------------------------------------------------

# 30/minute — clients refresh tokens often (every 15 min expiry),
# but 30/min per IP is ample for legitimate use and blocks token-grinding attempts.
@router.post("/auth/refresh")
@limiter.limit("30/minute")
def refresh_token(
    request: Request,
    fanxi_refresh: str = Cookie(default=None),
    session: Session = Depends(get_session),
):
    client_ip = request.client.host if request.client else "unknown"

    if not fanxi_refresh:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token")

    user_id = decode_refresh_token(fanxi_refresh)
    if not user_id:
        # Possible token replay — log for NATASHA
        session.add(AuthEvent(
            event_type="token_replay",
            ip_address=client_ip,
            user_agent=request.headers.get("user-agent", ""),
            details="Invalid or expired refresh token submitted",
        ))
        session.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    # Log successful refresh
    session.add(AuthEvent(
        user_id=user.id,
        event_type="token_refresh",
        ip_address=client_ip,
    ))
    session.commit()

    access_token = create_access_token({"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}


# ---------------------------------------------------------------------------
# Logout — clears the refresh cookie. Frontend must also discard the access
# token from memory (it cannot be revoked server-side without a token store).
# ---------------------------------------------------------------------------

@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response):
    response.delete_cookie(key="fanxi_refresh", path="/auth/refresh", samesite="none", secure=True)


# ---------------------------------------------------------------------------
# Forgot password — request schemas
# ---------------------------------------------------------------------------

class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


# ---------------------------------------------------------------------------
# Forgot Password — sends a reset link to the user's email
# ---------------------------------------------------------------------------

@router.post("/auth/forgot-password")
def forgot_password(body: ForgotPasswordRequest, session: Session = Depends(get_session)):
    # Always return 200 to avoid leaking account existence
    SAFE_RESPONSE = {"message": "If that email is registered, a reset link has been sent."}

    user = session.exec(select(User).where(User.email == body.email)).first()
    if not user:
        return SAFE_RESPONSE

    # Delete any existing unused tokens for this user
    existing_tokens = session.exec(
        select(PasswordResetToken).where(
            (PasswordResetToken.user_id == user.id) & (PasswordResetToken.used == False)  # noqa: E712
        )
    ).all()
    for t in existing_tokens:
        session.delete(t)

    # Generate a fresh token
    raw_token = secrets.token_urlsafe(32)
    reset_token = PasswordResetToken(
        user_id=user.id,
        token=raw_token,
        expires_at=datetime.utcnow() + timedelta(hours=1),
    )
    session.add(reset_token)
    session.commit()

    reset_url = f"{settings.frontend_url}/reset-password?token={raw_token}"

    try:
        from app.core.email import send_reset_email
        send_reset_email(user.email, reset_url)
    except Exception as exc:
        print(f"[email ERROR] {type(exc).__name__}: {exc}")
        raise HTTPException(status_code=500, detail=f"Email send failed: {exc}")

    return SAFE_RESPONSE


# ---------------------------------------------------------------------------
# Reset Password — validates token and updates the hashed password
# ---------------------------------------------------------------------------

@router.post("/auth/reset-password")
def reset_password(body: ResetPasswordRequest, session: Session = Depends(get_session)):
    token_row = session.exec(
        select(PasswordResetToken).where(PasswordResetToken.token == body.token)
    ).first()

    if not token_row or token_row.used:
        raise HTTPException(status_code=400, detail="Invalid or already used reset token.")

    if datetime.utcnow() > token_row.expires_at:
        raise HTTPException(status_code=400, detail="Reset token has expired. Please request a new one.")

    user = session.get(User, token_row.user_id)
    if not user:
        raise HTTPException(status_code=400, detail="User not found.")

    user.hashed_password = get_password_hash(body.new_password)
    token_row.used = True
    session.add(user)
    session.add(token_row)
    session.commit()

    return {"message": "Password updated. You can now log in."}


# ---------------------------------------------------------------------------
# Google OAuth — /auth/google  →  Google consent  →  /auth/google/callback
# ---------------------------------------------------------------------------

@router.get("/auth/google")
def google_auth_redirect():
    """Redirect the browser to Google's OAuth consent screen."""
    params = urllib.parse.urlencode({
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
    })
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{params}")


@router.get("/auth/google/callback")
def google_auth_callback(code: str, session: Session = Depends(get_session)):
    """Exchange Google code for user info, find/create user, set cookie, redirect."""
    # 1. Exchange authorisation code for Google access token
    with httpx.Client() as client:
        token_res = client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": settings.google_redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        if token_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Google token exchange failed")

        google_access_token = token_res.json().get("access_token")

        # 2. Fetch the user's Google profile
        info_res = client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {google_access_token}"},
        )
        if info_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch Google profile")

        info = info_res.json()

    google_id: str = info["id"]
    email: str = info["email"]
    display_name: str = info.get("name", "")

    # 3. Find or create the user
    user = session.exec(select(User).where(User.google_id == google_id)).first()

    if not user:
        # Try linking by email (existing manual account)
        user = session.exec(select(User).where(User.email == email)).first()
        if user:
            user.google_id = google_id
            session.add(user)
            session.commit()
            session.refresh(user)

    if not user:
        # Brand-new Google user — generate a unique username
        base = re.sub(r"[^a-zA-Z0-9_]", "", display_name.lower().replace(" ", "_"))[:15] or "scout"
        username = base
        suffix = 1
        while session.exec(select(User).where(User.username == username)).first():
            username = f"{base}{suffix}"
            suffix += 1

        # Store an unguessable locked password — Google users authenticate via OAuth only
        user = User(
            username=username,
            email=email,
            hashed_password=get_password_hash(secrets.token_urlsafe(32)),
            country_allegiance="",
            google_id=google_id,
            rank_title="Scout",
        )
        session.add(user)
        session.commit()
        session.refresh(user)

    # 4. Issue FanXI tokens
    access_token = create_access_token({"sub": str(user.id)})
    refresh_tok = create_refresh_token(user.id)

    # 5. Redirect to frontend callback page with access token in query param
    frontend_redirect = f"{settings.frontend_url}/auth/callback?token={access_token}"
    response = RedirectResponse(url=frontend_redirect)
    response.set_cookie(
        key="fanxi_refresh",
        value=refresh_tok,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=60 * 60 * 24 * 7,
        path="/auth/refresh",
    )
    return response


# ---------------------------------------------------------------------------
# Username availability check — lightweight, no auth required
# ---------------------------------------------------------------------------

@router.get("/users/check/{username}")
def check_username(username: str, session: Session = Depends(get_session)):
    """Returns {"available": true} if the username is free to use."""
    existing = session.exec(select(User).where(User.username == username.lower())).first()
    return {"available": existing is None}


# ---------------------------------------------------------------------------
# Onboarding — Google OAuth users complete their profile here
# ---------------------------------------------------------------------------

@router.patch("/users/me/onboarding", response_model=UserRead)
def complete_onboarding(
    body: OnboardingUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    new_username = body.username.lower()

    # Check username uniqueness (allow keeping current username unchanged)
    if new_username != current_user.username:
        existing = session.exec(select(User).where(User.username == new_username)).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")

    current_user.username = new_username
    if body.display_name:
        current_user.display_name = body.display_name
    if body.avatar_id:
        current_user.avatar_id = body.avatar_id
    if body.favorite_nation:
        current_user.favorite_nation = body.favorite_nation
        current_user.country_allegiance = body.favorite_nation  # keep in sync
    if body.favorite_club:
        current_user.favorite_club = body.favorite_club
    if body.preferred_formation:
        current_user.preferred_formation = body.preferred_formation
    if body.tactical_style:
        current_user.tactical_style = body.tactical_style
    if body.wc_winner_pick:
        current_user.wc_winner_pick = body.wc_winner_pick
    if body.top_scorer_pick:
        current_user.top_scorer_pick = body.top_scorer_pick
    if body.biggest_upset_pick:
        current_user.biggest_upset_pick = body.biggest_upset_pick

    current_user.onboarding_complete = True
    session.add(current_user)
    session.commit()
    session.refresh(current_user)
    return current_user


# ---------------------------------------------------------------------------
# Public profile — returns safe public data for any user by username
# ---------------------------------------------------------------------------

@router.get("/users/profile/{username}")
def get_public_profile(username: str, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.username == username)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Scout not found")

    # Global rank: count of users with strictly more IQ points, + 1
    from sqlmodel import func
    higher_count = session.exec(
        select(func.count(User.id)).where(User.football_iq_points > user.football_iq_points)
    ).one()
    global_rank = higher_count + 1

    # Prediction count
    from app.models import MatchPrediction
    prediction_count = session.exec(
        select(func.count(MatchPrediction.id)).where(MatchPrediction.user_id == user.id)
    ).one()

    return {
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "avatar_id": user.avatar_id,
        "country_allegiance": user.country_allegiance,
        "football_iq_points": user.football_iq_points,
        "rank_title": user.rank_title,
        "global_rank": global_rank,
        "prediction_count": prediction_count,
        "favorite_nation": user.favorite_nation,
        "favorite_club": user.favorite_club,
        "preferred_formation": user.preferred_formation,
        "tactical_style": user.tactical_style,
    }
