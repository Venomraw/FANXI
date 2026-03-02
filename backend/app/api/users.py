from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.db import get_session
from app.models import User
from app.schemas import UserCreate, UserRead
from app.core.security import get_password_hash

router = APIRouter()

@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register_user(user_data: UserCreate, session: Session = Depends(get_session)):
    # 1. Check if username or email is already taken
    existing = session.exec(
        select(User).where(
            (User.username == user_data.username) | (User.email == user_data.email)
        )
    ).first()

    if existing:
        # Don't reveal whether it was the username or email that matched
        raise HTTPException(status_code=400, detail="Username or email already registered")

    # 2. Hash the password before it ever touches the DB
    hashed_pwd = get_password_hash(user_data.password)

    # 3. Build and persist the new Scout
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_pwd,
        country_allegiance=user_data.country_allegiance,
        rank_title="Scout",
    )

    session.add(new_user)
    session.commit()
    session.refresh(new_user)

    # response_model=UserRead strips hashed_password from the response
    return new_user
