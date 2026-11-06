
import secrets

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse

from ..services.gmail_service import (
    fetch_analyzed_messages,
    finish_google_oauth,
    start_google_oauth,
)

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


@router.get("/messages")
def gmail_messages():
    return fetch_analyzed_messages()
