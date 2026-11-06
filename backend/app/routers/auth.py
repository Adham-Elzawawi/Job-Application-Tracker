
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import bearer_scheme, get_current_user
from ..models import User
from ..schemas import LoginRequest, SignupRequest
from ..services.auth_service import (
    create_session,
    hash_password,
    revoke_session,
    verify_password,
)

router = APIRouter(tags=["Authentication"])


@router.post("/login")
def login(login_request: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == login_request.email))

    if not user or not verify_password(login_request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_session(db, user.id)
    return {"message": "Login successful", "session_token": token}


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(signup_request: SignupRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == signup_request.email))

    if user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already in use",
        )

    new_user = User(
        name=signup_request.name,
        email=signup_request.email,
        password_hash=hash_password(signup_request.password),
    )
    db.add(new_user)

    try:
        db.commit()
        db.refresh(new_user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already in use",
        )

    return {"message": "Signup successful", "user_id": new_user.id}


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    revoke_session(db, user.id, credentials.credentials)
