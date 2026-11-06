
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Application, User
from ..schemas import ApplicationForm

router = APIRouter(tags=["Applications"])


@router.get("/applications/{user_id}")
def get_applications(user_id: UUID, db: Session = Depends(get_db)):
    applications = db.scalars(
        select(Application).where(Application.user_id == user_id)
    ).all()

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


@router.post("/sendApplication", status_code=status.HTTP_201_CREATED)
def send_application(application: ApplicationForm, db: Session = Depends(get_db)):
    user = db.get(User, application.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    new_application = Application(
        user_id=application.user_id,
        company_name=application.company_name,
        position=application.position,
        status=application.status,
        applied_at=application.applied_at,
    )
    db.add(new_application)

    try:
        db.commit()
        db.refresh(new_application)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Application violates a database constraint",
        )

    return {
        "message": "Application received",
        "application_id": new_application.id,
    }
