import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlmodel import Session, select

from app.db import get_session
from app.models import User, PasswordResetToken
from app.schemas import UserCreate, UserRead
from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token
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

@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register_user(user_data: UserCreate, session: Session = Depends(get_session)):
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
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    return new_user


# ---------------------------------------------------------------------------
# Login — returns JWT access token
# ---------------------------------------------------------------------------

@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    user = session.exec(
        select(User).where(User.username == form_data.username)
    ).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    token = create_access_token({"sub": str(user.id)})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "country_allegiance": user.country_allegiance,
            "football_iq_points": user.football_iq_points,
            "rank_title": user.rank_title,
        },
    }


# ---------------------------------------------------------------------------
# Me — returns current logged-in user
# ---------------------------------------------------------------------------

@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


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
