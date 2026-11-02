
from uuid import UUID

from fastapi import FastAPI, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import get_db
from .models import Application


app = FastAPI()


@app.get("/")
def read_root():
    return {"message": "Hello, World!"}


@app.get("/applications/{user_id}")
def get_applications(user_id: UUID, db: Session = Depends(get_db)):

    statement = select(Application).where(
        Application.user_id == user_id
    )

    applications = db.scalars(statement).all()

    return [
        {
            "id": application.id,
            "company_name": application.company_name,
            "position": application.position,
            "status": application.status,
            "applied_at": application.applied_at,
        }
        for application in applications
    ]
