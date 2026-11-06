
import secrets

from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import RedirectResponse

from sqlalchemy.orm import Session

from ..services.gmail_service import (
    fetch_analyzed_messages,
    finish_google_oauth,
    start_google_oauth,
    filter_emails,
)

from ..dependencies import get_current_user
from ..database import get_db
from ..schemas import EmailAnalysis
from ..models import User

router = APIRouter(prefix="/gmail", tags=["Gmail"])


@router.get("/connect")
def gmail_connect():
    authorization_url, state, code_verifier = start_google_oauth()
    response = RedirectResponse(authorization_url)
    response.set_cookie(
        "gmail_oauth_state", state, max_age=600, httponly=True, samesite="lax"
    )
    response.set_cookie(
        "gmail_code_verifier", code_verifier,
        max_age=600, httponly=True, samesite="lax",
    )
    return response


@router.get("/callback")
def gmail_callback(request: Request, code: str, state: str):
    saved_state = request.cookies.get("gmail_oauth_state")
    code_verifier = request.cookies.get("gmail_code_verifier")

    if (
        not saved_state
        or not secrets.compare_digest(saved_state, state)
        or not code_verifier
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid OAuth state or missing code verifier",
        )

    finish_google_oauth(code, state, code_verifier)
    response = RedirectResponse("/docs")
    response.delete_cookie("gmail_oauth_state")
    response.delete_cookie("gmail_code_verifier")
    return response



@router.post("/messages")
def gmail_messages(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    gmail_result = fetch_analyzed_messages()

    analyses = [
        EmailAnalysis.model_validate(email["analysis"])
        for email in gmail_result["emails"]
    ]

    result = filter_emails(analyses, db, user)

    return {
        "message": "Finished syncing applications",
        "added": result["added"],
        "updated": result["updated"]
    }

