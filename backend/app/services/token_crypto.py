
import os
from pathlib import Path

from dotenv import load_dotenv
from cryptography.fernet import Fernet

BACKEND_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_DIR / ".env")

ENCRYPTION_KEY = os.environ["GOOGLE_TOKEN_ENCRYPTION_KEY"]

fernet = Fernet(ENCRYPTION_KEY.encode())


def encrypt_token(token: str) -> str:
    """Encrypt Google OAuth credentials before storing them."""
    return fernet.encrypt(token.encode()).decode()


def decrypt_token(encrypted_token: str) -> str:
    """Decrypt stored Google OAuth credentials."""
    return fernet.decrypt(encrypted_token.encode()).decode()
