import os
import hashlib
import uuid
import secrets

from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv

from sqlalchemy import delete, select
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone

from itsdangerous import (
    URLSafeTimedSerializer,
    BadSignature,
)

from ..services.gmail_service import (
    fetch_analyzed_messages,
    finish_google_oauth,
    start_google_oauth,
    filter_emails,
)

from ..dependencies import get_current_user
from ..database import get_db
from ..schemas import EmailAnalysis, ReadEmailsRequest
from ..models import User, GmailConnectTicket, Emails

router = APIRouter(prefix="/gmail", tags=["Gmail"])

load_dotenv()

oauth_signer = URLSafeTimedSerializer(
    os.environ["OAUTH_STATE_SECRET"],
    salt="gmail-oauth",
)

BACKEND_URL = os.getenv(
    "BACKEND_PUBLIC_URL",
    "http://localhost:8000",
).rstrip("/")

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:3000",
).rstrip("/")

COOKIE_SECURE = os.getenv("ENVIRONMENT") == "production"


@router.post("/connect/start")
def gmail_connect_start(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Generate a random, short-lived connection ticket.
    ticket = secrets.token_urlsafe(32)

    ticket_hash = hashlib.sha256(
        ticket.encode()
    ).hexdigest()

    db.add(
        GmailConnectTicket(
            token_hash=ticket_hash,
            user_id=user.id,
            expires_at=(
                datetime.now(timezone.utc)
                + timedelta(minutes=5)
            ),
        )
    )

    db.commit()

    return {
        "connect_url": (
            f"{BACKEND_URL}/gmail/connect?ticket={ticket}"
        )
    }




@router.get("/connect")
def gmail_connect(
    ticket: str,
    db: Session = Depends(get_db),
):
    ticket_hash = hashlib.sha256(
        ticket.encode()
    ).hexdigest()

    # Atomically retrieve and consume the ticket.
    user_id = db.scalar(
        delete(GmailConnectTicket)
        .where(
            GmailConnectTicket.token_hash == ticket_hash,
            GmailConnectTicket.expires_at
            > datetime.now(timezone.utc),
        )
        .returning(GmailConnectTicket.user_id)
    )

    if user_id is None:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired connection ticket",
        )

    db.commit()

    # Start the existing Google OAuth flow.
    authorization_url, state, code_verifier = (
        start_google_oauth()
    )

    response = RedirectResponse(authorization_url)

    response.set_cookie(
        "gmail_oauth_state",
        state,
        max_age=600,
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
        path="/gmail",
    )

    response.set_cookie(
        "gmail_code_verifier",
        code_verifier,
        max_age=600,
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
        path="/gmail",
    )

    # Signed context linking OAuth to the application user.
    signed_context = oauth_signer.dumps({
        "user_id": str(user_id),
        "state": state,
    })

    response.set_cookie(
        "gmail_oauth_context",
        signed_context,
        max_age=600,
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
        path="/gmail",
    )

    response.headers["Cache-Control"] = "no-store"
    response.headers["Referrer-Policy"] = "no-referrer"

    return response




@router.get("/callback")
def gmail_callback(
    request: Request,
    code: str,
    state: str,
    db: Session = Depends(get_db),
):
    saved_state = request.cookies.get("gmail_oauth_state")
    code_verifier = request.cookies.get("gmail_code_verifier")
    signed_context = request.cookies.get("gmail_oauth_context")

    if (
        not saved_state
        or not secrets.compare_digest(saved_state, state)
        or not code_verifier
        or not signed_context
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid OAuth state or missing credentials",
        )

    try:
        context = oauth_signer.loads(
            signed_context,
            max_age=600,
        )

        if not secrets.compare_digest(
            context["state"],
            state,
        ):
            raise ValueError("OAuth state mismatch")

        user_id = uuid.UUID(context["user_id"])

    except (BadSignature, ValueError, KeyError, TypeError):
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired OAuth session",
        )

    user = db.get(User, user_id)

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    # Existing service function now stores credentials in DB.
    finish_google_oauth(
        code=code,
        state=state,
        code_verifier=code_verifier,
        user_id=user_id,
        db=db,
    )

    response = RedirectResponse(
        f"{FRONTEND_URL}/settings"
    )

    for name in (
        "gmail_oauth_state",
        "gmail_code_verifier",
        "gmail_oauth_context",
    ):
        response.delete_cookie(name, path="/gmail")

    return response


@router.post("/messages")
def gmail_messages(
    request: ReadEmailsRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    selected_emails = set(request.emails)
    selected_emails = set(request.emails)

    if not selected_emails:
        raise HTTPException(
            status_code=400,
            detail="No Gmail accounts selected",
        )

    # Retrieve only accounts belonging to this user
    accounts = db.scalars(
        select(Emails).where(
            Emails.user_id == user.id,
            Emails.email.in_(selected_emails)
        )
    ).all()

    # Reject accounts the user doesn't own or hasn't connected
    if (
        {account.email for account in accounts} != selected_emails
        or any(not account.encrypted_token for account in accounts)
    ):
        raise HTTPException(
            status_code=400,
            detail="One or more Gmail accounts are not connected",
        )

    all_analyses = []

    for account in accounts:
        print(f"Processing account: {account.email}", flush=True)

        gmail_result = fetch_analyzed_messages(account, db)

        analyses = [
            EmailAnalysis.model_validate(email["analysis"])
            for email in gmail_result["emails"]
        ]

        all_analyses.extend(analyses)

    # Save results from all selected Gmail accounts
    result = filter_emails(all_analyses, db, user)

    return {
        "message": "Finished syncing applications",
        "added": result["added"],
        "updated": result["updated"]
    }


