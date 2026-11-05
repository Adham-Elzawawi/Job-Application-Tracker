
from uuid import UUID

from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from pwdlib import PasswordHash

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from .database import get_db
from .models import Application, User, AuthSession

from .schemas import LoginRequest, SignupRequest, ApplicationForm

app = FastAPI()


password_hash = PasswordHash.recommended()

def hash_password(password: str) -> str:
    """Hash a plaintext password before storing it in the database."""
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    """Check a plaintext password against a stored hash."""
    return password_hash.verify(password, hashed_password)

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Validate the session token and return its associated user."""

    # Hash the received token to match the stored token hash.
    token_hash = hashlib.sha256(
        credentials.credentials.encode("utf-8")
    ).hexdigest()

    # Look up a valid, non-expired session.
    session = db.scalar(
        select(AuthSession).where(
            AuthSession.token_hash == token_hash,
            AuthSession.expires_at > datetime.now(timezone.utc),
        )
    )

    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )

    # Retrieve the user associated with the session.
    user = db.get(User, session.user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session user not found",
        )

    return user

@app.get("/")
def read_root():
    return {"message": "Hello, World!"}


@app.get("/applications/{user_id}")
def get_applications(user_id: UUID, db: Session = Depends(get_db)):

    statement = select(Application).where(
        Application.user_id == user_id
    )

    applications = db.scalars(statement).all()

    return [
        {
            "id": application.id,
            "company_name": application.company_name,
            "position": application.position,
            "status": application.status,
            "applied_at": application.applied_at,
        }
        for application in applications
    ]

@app.post("/login")
def login(
    login_request: LoginRequest,
    db: Session = Depends(get_db)
):
    """Authenticate the user and create a session."""

    # Retrieve user by email.
    user = db.scalar(
        select(User).where(User.email == login_request.email)
    )

    # Verify credentials.
    if not user or not verify_password(
        login_request.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Generate a cryptographically secure session token.
    token = secrets.token_urlsafe(32)

    # Store only the token hash in PostgreSQL.
    session = AuthSession(
        user_id=user.id,
        token_hash=hashlib.sha256(
            token.encode("utf-8")
        ).hexdigest(),
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
    )

    db.add(session)
    db.commit()

    return {
        "message": "Login successful",
        "session_token": token,
    }


@app.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(
    signup_request: SignupRequest,
    db: Session = Depends(get_db)
):
    """Register a new user in PostgreSQL."""
    print(f"Received signup request: {signup_request}")

    # Check whether the email is already registered.
    user = db.scalar(
        select(User).where(User.email == signup_request.email)
    )

    if user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already in use"
        )

    # Create a new user with a hashed password.
    new_user = User(
        name=signup_request.name,
        email=signup_request.email,
        password_hash=hash_password(signup_request.password),
    )

    # Add and persist the user in PostgreSQL.
    db.add(new_user)

    try:
        db.commit()
        db.refresh(new_user)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already in use"
        )

    return {
        "message": "Signup successful",
        "user_id": new_user.id
    }


@app.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Invalidate the current user's session."""

    # Hash the received token to match the stored token hash.
    token_hash = hashlib.sha256(
        credentials.credentials.encode("utf-8")
    ).hexdigest()

    # Retrieve the current session.
    session = db.scalar(
        select(AuthSession).where(
            AuthSession.token_hash == token_hash,
            AuthSession.user_id == user.id,
        )
    )

    # Delete the session from PostgreSQL.
    if session:
        db.delete(session)
        db.commit()
    

@app.post("/sendApplication", status_code=status.HTTP_201_CREATED)
def send_application(
    application: ApplicationForm,
    db: Session = Depends(get_db)
):
    """Store a new job application in PostgreSQL."""

    # Check whether the user exists.
    user = db.get(User, application.user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Create the application.
    new_application = Application(
        user_id=application.user_id,
        company_name=application.company_name,
        position=application.position,
        status=application.status,
        applied_at=application.applied_at
    )

    db.add(new_application)

    try:
        db.commit()
        db.refresh(new_application)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Application violates a database constraint"
        )

    return {
        "message": "Application received",
        "application_id": new_application.id
    }

@app.get("/users/me")
def read_current_user(
    user: User = Depends(get_current_user),
):
    """Return the currently authenticated user's information."""

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
    }
