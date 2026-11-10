
from pathlib import Path

from fastapi import HTTPException
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from datetime import datetime, timezone
import json
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from .llm import analyze_emails_batch
from .token_crypto import encrypt_token, decrypt_token

from ..schemas import EmailAnalysis
from ..models import Application, User, Emails

from time import perf_counter


BACKEND_DIR = Path(__file__).resolve().parents[2]
CLIENT_SECRETS_FILE = BACKEND_DIR / "credentials.json"
TOKEN_FILE = BACKEND_DIR / ".gmail_token.json"
SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]
REDIRECT_URI = "http://localhost:8000/gmail/callback"




def start_google_oauth() -> tuple[str, str, str]:
    flow = Flow.from_client_secrets_file(
        str(CLIENT_SECRETS_FILE),
        scopes=SCOPES,
        autogenerate_code_verifier=True,
    )
    flow.redirect_uri = REDIRECT_URI
    authorization_url, state = flow.authorization_url(
        access_type="offline",
        prompt="consent select_account",
    )
    if not flow.code_verifier:
        raise HTTPException(status_code=500, detail="OAuth PKCE verifier not generated")
    return authorization_url, state, flow.code_verifier


def finish_google_oauth(
    code: str,
    state: str,
    code_verifier: str,
    user_id: UUID,
    db: Session
):
    flow = Flow.from_client_secrets_file(
        str(CLIENT_SECRETS_FILE),
        scopes=SCOPES,
        state=state,
        code_verifier=code_verifier,
    )

    flow.redirect_uri = REDIRECT_URI
    flow.fetch_token(code=code)

    # Identify the Gmail account that authorized access
    service = build(
        "gmail",
        "v1",
        credentials=flow.credentials
    )

    profile = service.users().getProfile(userId="me").execute()
    email_address = profile["emailAddress"]

    # Check whether this account already exists for the user
    account = db.scalar(
        select(Emails).where(
            Emails.user_id == user_id,
            Emails.email == email_address
        )
    )

    if account is None:
        account = Emails(
            user_id=user_id,
            email=email_address
        )
        db.add(account)

    # Encrypt and save the account's OAuth credentials
    account.encrypted_token = encrypt_token(
        flow.credentials.to_json()
    )

    db.commit()

    return email_address


def get_gmail_client(account: Emails, db: Session):
    if not account.encrypted_token:
        raise HTTPException(
            status_code=400,
            detail="Gmail account not connected",
        )

    decrypted_json = decrypt_token(account.encrypted_token)

    credentials = Credentials.from_authorized_user_info(
        json.loads(decrypted_json),
        SCOPES,
    )

    if credentials.expired and credentials.refresh_token:
        credentials.refresh(GoogleRequest())

        # Encrypt the refreshed credentials
        account.encrypted_token = encrypt_token(
            credentials.to_json()
        )

        db.commit()

    if not credentials.valid:
        raise HTTPException(
            status_code=401,
            detail="Gmail authorization expired. Reconnect Gmail.",
        )

    return build("gmail", "v1", credentials=credentials)



def fetch_analyzed_messages(
    account: Emails,
    db: Session
) -> dict:
    total_start = perf_counter()

    service = get_gmail_client(account, db)

    profile = service.users().getProfile(userId="me").execute()

    print(
        f"Reading Gmail account: {profile['emailAddress']}",
        flush=True,
    )

    # Step 1: Retrieve Gmail messages
    fetch_start = perf_counter()

    result = service.users().messages().list(
        userId="me",
        maxResults=200,
        q="newer_than:70d",
    ).execute()

    raw_emails = []

    for message in result.get("messages", []):
        email = service.users().messages().get(
            userId="me",
            id=message["id"],
            format="metadata",
            metadataHeaders=["From", "Subject", "Date"],
        ).execute()

        headers = {
            header["name"].lower(): header["value"]
            for header in email.get("payload", {}).get("headers", [])
        }

        email_date = datetime.fromtimestamp(
            int(email["internalDate"]) / 1000,
            tz=timezone.utc,
        )

        raw_emails.append({
            "id": email["id"],
            "sender": headers.get("from", ""),
            "subject": headers.get("subject", ""),
            "content": email.get("snippet", ""),
            "date": headers.get("date"),
            "email_date": email_date,
        })

    fetch_duration = perf_counter() - fetch_start

    print(
        f"\nFetched {len(raw_emails)} emails "
        f"in {fetch_duration:.2f}s",
        flush=True,
    )

    # Step 2: Analyze messages in batches
    emails = []
    in_progress = 0
    accepted = 0
    rejected = 0

    BATCH_SIZE = 5

    analysis_start = perf_counter()

    for i in range(0, len(raw_emails), BATCH_SIZE):
        batch = raw_emails[i:i + BATCH_SIZE]

        batch_start = perf_counter()

        analyses = analyze_emails_batch(batch)

        batch_duration = perf_counter() - batch_start

        print(
            f"Batch {i // BATCH_SIZE + 1}: "
            f"{len(batch)} emails analyzed in "
            f"{batch_duration:.2f}s",
            flush=True,
        )

        for email, analysis in zip(batch, analyses):
            if not analysis.is_application_related:
                continue

            emails.append({
                "id": email["id"],
                "from": email["sender"],
                "subject": email["subject"],
                "date": email["date"],
                "snippet": email["content"],
                "analysis": analysis.model_dump(),
            })

            if analysis.status == "accepted":
                accepted += 1
            elif analysis.status == "rejected":
                rejected += 1
            elif analysis.status in ("applied", "interview"):
                in_progress += 1

    analysis_duration = perf_counter() - analysis_start
    total_duration = perf_counter() - total_start

    # Step 3: Print performance summary
    print("\n========== PERFORMANCE SUMMARY ==========", flush=True)

    print(f"Emails fetched:       {len(raw_emails)}", flush=True)
    print(f"Relevant emails:      {len(emails)}", flush=True)
    print(f"Gmail fetch time:     {fetch_duration:.2f}s", flush=True)
    print(f"Qwen analysis time:   {analysis_duration:.2f}s", flush=True)

    if raw_emails:
        print(
            f"Average per email:    "
            f"{analysis_duration / len(raw_emails):.2f}s",
            flush=True,
        )

    print(f"Total elapsed time:   {total_duration:.2f}s", flush=True)
    print("=========================================\n", flush=True)

    return {
        "emails": emails,
        "count_emails": len(emails),
        "in progress": in_progress,
        "accepted": accepted,
        "rejected": rejected,
    }


def filter_emails(
    emails: list[EmailAnalysis],
    db: Session,
    user: User
):
    """Create or update applications using the latest email status."""

    added_applications = 0
    updated_applications = set()

    def normalize(value: str) -> str:
        return " ".join(value.casefold().split())

    try:
        applications = db.scalars(
            select(Application).where(Application.user_id == user.id)
        ).all()

        application_map = {
            (normalize(app.company_name), normalize(app.position)): app
            for app in applications
        }

        # Only keep emails with enough information.
        valid_emails = [
            email for email in emails
            if email.is_application_related
            and email.company_name
            and email.position
            and email.status
            and email.email_date is not None
        ]

        # Process emails chronologically.
        sorted_emails = sorted(
            valid_emails,
            key=lambda email: email.email_date
        )

        for email in sorted_emails:
            key = (
                normalize(email.company_name),
                normalize(email.position)
            )

            application = application_map.get(key)

            if application is None:
                application = Application(
                    user_id=user.id,
                    company_name=email.company_name,
                    position=email.position,
                    status=email.status,
                    last_email_date=email.email_date
                )

                db.add(application)
                application_map[key] = application
                added_applications += 1

            elif (
                application.last_email_date is None
                or email.email_date > application.last_email_date
            ):
                application.status = email.status
                application.last_email_date = email.email_date

                updated_applications.add(key)

        db.commit()

        return {
            "added": added_applications,
            "updated": len(updated_applications)
        }

    except Exception:
        db.rollback()
        raise

