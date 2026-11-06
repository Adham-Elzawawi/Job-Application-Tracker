
from pathlib import Path

from fastapi import HTTPException
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from .llm import analyze_email
from ..schemas import EmailAnalysis
from ..models import Application, User


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
        prompt="consent",
    )
    if not flow.code_verifier:
        raise HTTPException(status_code=500, detail="OAuth PKCE verifier not generated")
    return authorization_url, state, flow.code_verifier


def finish_google_oauth(code: str, state: str, code_verifier: str) -> None:
    flow = Flow.from_client_secrets_file(
        str(CLIENT_SECRETS_FILE),
        scopes=SCOPES,
        state=state,
        code_verifier=code_verifier,
    )
    flow.redirect_uri = REDIRECT_URI
    flow.fetch_token(code=code)

    TOKEN_FILE.write_text(flow.credentials.to_json())
    TOKEN_FILE.chmod(0o600)


def get_gmail_client():
    if not TOKEN_FILE.exists():
        raise HTTPException(
            status_code=400,
            detail="Connect Gmail first at /gmail/connect",
        )

    credentials = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)
    if credentials.expired and credentials.refresh_token:
        credentials.refresh(GoogleRequest())
        TOKEN_FILE.write_text(credentials.to_json())
        TOKEN_FILE.chmod(0o600)

    if not credentials.valid:
        raise HTTPException(
            status_code=401,
            detail="Gmail authorization expired. Reconnect Gmail.",
        )

    return build("gmail", "v1", credentials=credentials)


def fetch_analyzed_messages() -> dict:
    service = get_gmail_client()
    result = service.users().messages().list(
        userId="me",
        maxResults=10,
        q="newer_than:600d {application interview job}",
    ).execute()

    emails = []
    in_progress = 0
    accepted = 0
    rejected = 0

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

        # Convert Gmail's timestamp from milliseconds to a datetime.
        email_date = datetime.fromtimestamp(
            int(email["internalDate"]) / 1000,
            tz=timezone.utc
        )

        analysis = analyze_email(
            sender=headers.get("from", ""),
            subject=headers.get("subject", ""),
            content=email.get("snippet", ""),
            email_date=email_date,
        )

        if not analysis.is_application_related:
            continue

        emails.append({
            "id": email["id"],
            "from": headers.get("from"),
            "subject": headers.get("subject"),
            "date": headers.get("date"),
            "snippet": email.get("snippet"),
            "analysis": analysis.model_dump(),
        })

        if analysis.status == "accepted":
            accepted += 1
        elif analysis.status == "rejected":
            rejected += 1
        elif analysis.status in ("applied", "interview"):
            in_progress += 1

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

