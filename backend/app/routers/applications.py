
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Application, User
from ..schemas import ApplicationForm
from ..dependencies import get_current_user

router = APIRouter(tags=["Applications"])


@router.get("/applications/me")
def get_applications(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    applications = db.scalars(
        select(Application).where(Application.user_id == user.id)
    ).all()

    return [
        {
            "id": application.id,
            "company_name": application.company_name,
            "position": application.position,
            "status": application.status,
            "last_email_date": application.last_email_date,
            "created_at": application.created_at,
            "updated_at": application.updated_at,
        }
        for application in applications
    ]


@router.post("/sendApplication", status_code=status.HTTP_201_CREATED)
def send_application(
    application: ApplicationForm,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_application = Application(
        user_id=user.id,
        company_name=application.company_name,
        position=application.position,
        status=application.status,
    )

    db.add(new_application)

    try:
        db.commit()
        db.refresh(new_application)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Application violates a database constraint"
        )

    return {
        "message": "Application received",
        "application_id": new_application.id
    }