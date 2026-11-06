
from pathlib import Path

from fastapi import HTTPException
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from .llm import analyze_email

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

        analysis = analyze_email(
            sender=headers.get("from", ""),
            subject=headers.get("subject", ""),
            content=email.get("snippet", ""),
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
