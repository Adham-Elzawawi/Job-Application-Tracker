
from pydantic import BaseModel, EmailStr
import datetime

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class SignupRequest(LoginRequest):
    name: str


class ApplicationForm(BaseModel):
    user_id: str
    company_name: str
    position: str
    status: str
    applied_at: datetime.datetime