from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlmodel import Session, select

from app.db import get_session
from app.models import User
from app.schemas import UserCreate, UserRead
from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token

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
