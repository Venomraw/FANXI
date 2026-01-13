from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.db import get_session
from app.models import User
from app.core.security import get_password_hash

router = APIRouter()

@router.post("/register")
def register_user(user_data: User, session: Session = Depends(get_session)):
    # 1. Check if user already exists
    statement = select(User).where(User.username == user_data.username)
    existing_user = session.exec(statement).first()
    
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # 2. Cyber-Security Haki: Hash the password
    hashed_pwd = get_password_hash(user_data.hashed_password)
    
    # 3. Save the new 'Scout' to the database
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_pwd, # Store the hash, not the secret!
        country_allegiance=user_data.country_allegiance,
        rank_title="Scout" # Every legend starts as a Scout
    )
    
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    
    return {"message": f"Welcome to FanXI, {new_user.username}! Your journey begins."}