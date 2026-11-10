
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Literal


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class SignupRequest(LoginRequest):
    name: str


class ApplicationForm(BaseModel):
    company_name: str
    position: str
    status: str
    

class EmailAnalysis(BaseModel):
    is_application_related: bool
    company_name: str | None = None
    position: str | None = None
    status: Literal[
        "applied", "interview", "accepted", "rejected"
    ] | None = None
    email_date: datetime | None = None

class EmailRequest(BaseModel):
    email: str


class ReadEmailsRequest(BaseModel):
    emails: list[str]