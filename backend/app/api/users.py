from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.db import get_session
from app.models import User
from app.schemas import UserCreate, UserRead
from app.core.security import get_password_hash

router = APIRouter()


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register_user(user_data: UserCreate, session: Session = Depends(get_session)):
    """
    Register a new user (Scout) in the FanXI system.

    Security notes:
    - Input is validated by UserCreate, NOT the raw User SQLModel table.
      Accepting the table model directly would let a client POST any field,
      including hashed_password, rank_title, or football_iq_points.
    - response_model=UserRead ensures FastAPI serialises the response through
      UserRead, which does not include hashed_password. The hash never leaves
      the server.
    - The duplicate check covers both username and email in a single query so
      the error message can stay vague (see below).
    """

    # --- Duplicate check ---
    # We check username OR email in one query.
    # The error message is intentionally vague: returning "username taken" vs
    # "email taken" as separate messages would let an attacker enumerate which
    # emails are registered (user enumeration attack).
    existing = session.exec(
        select(User).where(
            (User.username == user_data.username) | (User.email == user_data.email)
        )
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Username or email already registered")

    # --- Password hashing ---
    # user_data.password is the plain-text string from the request body.
    # get_password_hash (bcrypt) turns it into a one-way hash.
    # The original password is never stored or logged anywhere.
    hashed_pwd = get_password_hash(user_data.password)

    # --- Persist the new Scout ---
    # rank_title is hard-coded here, not taken from the request, so a client
    # cannot self-promote to "Admin" or any other privileged rank on sign-up.
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_pwd,
        country_allegiance=user_data.country_allegiance,
        rank_title="Scout",  # every account starts at the lowest rank
    )

    session.add(new_user)
    session.commit()
    session.refresh(new_user)  # populate auto-generated id and defaults

    # FastAPI applies response_model=UserRead here, stripping hashed_password
    return new_user
