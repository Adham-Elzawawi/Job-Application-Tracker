from pathlib import Path

from fastapi import HTTPException

from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from datetime import datetime, timezone
import json
from uuid import UUID
import base64
import binascii
import re
import random
from bs4 import BeautifulSoup
from time import perf_counter
import time


from sqlalchemy import select
from sqlalchemy.orm import Session

from .llm import analyze_emails_batch
from .token_crypto import encrypt_token, decrypt_token

from ..schemas import EmailAnalysis
from ..models import Application, User, Emails
from ..helpers.email_pre_filter import should_skip_pre_llm

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



def execute_gmail_request(request, max_retries=6):
    """
    Execute a Gmail API request with bounded
    exponential backoff for transient errors.
    """

    for attempt in range(max_retries + 1):
        try:
            return request.execute()

        except HttpError as error:
            status = error.resp.status

            content = error.content.decode(
                "utf-8", errors="replace"
            ).lower()

            rate_limited = (
                status == 403
                and (
                    "ratelimitexceeded" in content
                    or "rate_limit_exceeded" in content
                    or "quota exceeded" in content
                )
            )

            retryable = (
                rate_limited
                or status in (429, 500, 502, 503, 504)
            )

            if not retryable or attempt == max_retries:
                raise

            delay = min(
                2 ** attempt + random.random(),
                32,
            )

            print(
                f"Gmail API error {status}. "
                f"Retrying in {delay:.1f}s "
                f"({attempt + 1}/{max_retries})",
                flush=True,
            )

            time.sleep(delay)


def extract_email_body(payload: dict) -> str:
    """Extract readable text from a Gmail MIME payload."""

    plain_parts = []
    html_parts = []

    def walk(part: dict):
        # Ignore attachments.
        if part.get("filename"):
            return

        mime_type = part.get("mimeType", "").lower()
        encoded_data = part.get("body", {}).get("data")

        if encoded_data and mime_type in (
            "text/plain",
            "text/html",
        ):
            try:
                padded = encoded_data + "=" * (
                    -len(encoded_data) % 4
                )

                decoded = base64.urlsafe_b64decode(
                    padded
                ).decode("utf-8", errors="replace")

                if mime_type == "text/plain":
                    plain_parts.append(decoded)
                else:
                    html_parts.append(decoded)

            except (ValueError, binascii.Error):
                pass

        # Handle nested multipart emails.
        for child in part.get("parts", []):
            walk(child)

    walk(payload)

    if plain_parts:
        text = "\n\n".join(plain_parts)

    elif html_parts:
        html = "\n\n".join(html_parts)

        soup = BeautifulSoup(html, "html.parser")

        for element in soup(
            ["script", "style", "head"]
        ):
            element.decompose()

        text = soup.get_text(
            separator="\n",
            strip=True,
        )

    else:
        return ""

    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()



def fetch_analyzed_messages(
    account: Emails,
    db: Session,
) -> dict:

    total_start = perf_counter()

    MAX_MESSAGES = 40
    MAX_BODY_CHARS = 4000
    BATCH_SIZE = 3
    REQUEST_DELAY = 1.5

    # =========================================
    # STEP 1: Connect to Gmail
    # =========================================

    service = get_gmail_client(account, db)

    profile = execute_gmail_request(
        service.users().getProfile(userId="me")
    )

    print(
        f"\nReading Gmail account: "
        f"{profile['emailAddress']}",
        flush=True,
    )

    # =========================================
    # STEP 2: Retrieve message IDs
    # =========================================

    fetch_start = perf_counter()

    result = execute_gmail_request(
        service.users().messages().list(
            userId="me",
            maxResults=MAX_MESSAGES,
            q="newer_than:50d",
        )
    )

    messages = result.get("messages", [])

    raw_emails = []
    skipped_emails = 0
    snippet_fallbacks = 0

    # =========================================
    # STEP 3: Metadata + preliminary filtering
    # =========================================

    for index, message in enumerate(messages, start=1):

        message_id = message["id"]

        metadata = execute_gmail_request(
            service.users().messages().get(
                userId="me",
                id=message_id,
                format="metadata",
                metadataHeaders=[
                    "From",
                    "Subject",
                    "Date",
                ],
            )
        )

        headers = {
            header["name"].lower(): header["value"]
            for header in metadata.get(
                "payload", {}
            ).get("headers", [])
        }

        sender = headers.get("from", "")
        subject = headers.get("subject", "")
        snippet = metadata.get("snippet", "")

        # -------------------------------------
        # Pre-LLM filter
        # -------------------------------------

        if should_skip_pre_llm(
            sender=sender,
            subject=subject,
            snippet=snippet,
        ):
            skipped_emails += 1

            print(
                f"[{index}/{len(messages)}] "
                f"Skipped: {subject[:60]}",
                flush=True,
            )

            time.sleep(REQUEST_DELAY)
            continue

        # =====================================
        # STEP 4: Retrieve full email body
        # =====================================

        full_message = execute_gmail_request(
            service.users().messages().get(
                userId="me",
                id=message_id,
                format="full",
            )
        )

        content = extract_email_body(
            full_message.get("payload", {})
        )

        if not content:
            snippet_fallbacks += 1
            content = full_message.get(
                "snippet", ""
            )

        # Limit input length for the LLM.
        content = content[:MAX_BODY_CHARS]

        # Preserve the actual Gmail timestamp.
        email_date = datetime.fromtimestamp(
            int(full_message["internalDate"]) / 1000,
            tz=timezone.utc,
        )

        raw_emails.append({
            "id": message_id,
            "sender": sender,
            "subject": subject,
            "content": content,
            "date": headers.get("date", ""),
            "email_date": email_date,
        })

        print(
            f"[{index}/{len(messages)}] "
            f"Queued: {subject[:60]}",
            flush=True,
        )

        # Spread Gmail API requests over time.
        time.sleep(REQUEST_DELAY)

    fetch_duration = perf_counter() - fetch_start

    print(
        "\n========== GMAIL FETCH ==========",
        flush=True,
    )

    print(f"Messages scanned:   {len(messages)}")
    print(f"Messages skipped:   {skipped_emails}")
    print(f"Messages to Qwen:   {len(raw_emails)}")
    print(f"Snippet fallbacks:  {snippet_fallbacks}")
    print(f"Fetch duration:     {fetch_duration:.2f}s")

    # =========================================
    # STEP 5: Qwen batch analysis
    # =========================================

    emails = []

    in_progress = 0
    accepted = 0
    rejected = 0

    analysis_start = perf_counter()

    total_batches = (
        len(raw_emails) + BATCH_SIZE - 1
    ) // BATCH_SIZE

    for i in range(0, len(raw_emails), BATCH_SIZE):

        batch_number = i // BATCH_SIZE + 1
        batch = raw_emails[i:i + BATCH_SIZE]

        batch_start = perf_counter()

        # Your existing Qwen batch analyzer,
        # including individual-analysis fallback.
        analyses = analyze_emails_batch(batch)

        batch_duration = perf_counter() - batch_start

        print(
            f"Batch {batch_number}/{total_batches}: "
            f"{len(batch)} emails analyzed in "
            f"{batch_duration:.2f}s",
            flush=True,
        )

        # strict=True detects missing analyses.
        for email, analysis in zip(
            batch, analyses, strict=True
        ):

            # Never trust the LLM to determine
            # the Gmail message timestamp.
            analysis.email_date = email["email_date"]

            if not analysis.is_application_related:
                continue

            emails.append({
                "id": email["id"],
                "from": email["sender"],
                "subject": email["subject"],
                "date": email["date"],
                "snippet": email["content"][:200],
                "analysis": analysis.model_dump(),
            })

            if analysis.status == "accepted":
                accepted += 1

            elif analysis.status == "rejected":
                rejected += 1

            elif analysis.status in (
                "applied",
                "interview",
            ):
                in_progress += 1

    analysis_duration = perf_counter() - analysis_start
    total_duration = perf_counter() - total_start

    # =========================================
    # STEP 6: Performance summary
    # =========================================

    print(
        "\n========== PERFORMANCE SUMMARY ==========",
        flush=True,
    )

    print(f"Gmail account:       {account.email}")
    print(f"Messages scanned:    {len(messages)}")
    print(f"Pre-filtered:        {skipped_emails}")
    print(f"Sent to Qwen:        {len(raw_emails)}")
    print(f"Relevant emails:     {len(emails)}")
    print(f"Snippet fallbacks:   {snippet_fallbacks}")

    print(f"Gmail retrieval:     {fetch_duration:.2f}s")
    print(f"Qwen analysis:       {analysis_duration:.2f}s")

    if raw_emails:
        average = analysis_duration / len(raw_emails)

        print(
            f"Average per email:   {average:.2f}s"
        )

    print(f"Total duration:      {total_duration:.2f}s")

    print(
        "=========================================\n",
        flush=True,
    )

    # =========================================
    # STEP 7: Return analyzed emails
    # =========================================

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

