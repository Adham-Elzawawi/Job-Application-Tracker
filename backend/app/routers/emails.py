from fastapi import APIRouter, Depends, HTTPException, status

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select

from ..dependencies import get_current_user
from ..models import User, Emails
from ..database import get_db
from ..schemas import EmailRequest

router = APIRouter(prefix="/email", tags=["Email"])

@router.get("/getEmails")
def get_emails(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    emails = db.scalars(
        select(Emails)
        .where(Emails.user_id == user.id)
        .order_by(Emails.added_on)
    ).all()

    return {
        "emails": [
            {
                "id": str(email.id),
                "email": email.email
            }
            for email in emails
        ]
    }

@router.post("/addEmail", status_code=status.HTTP_201_CREATED)
def add_email(
    addEmailRequest: EmailRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing_email = db.scalar(
        select(Emails).where(
            Emails.user_id == user.id,
            Emails.email == addEmailRequest.email
        )
    )

    if existing_email is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already in use",
        )

    new_email = Emails(
        user_id=user.id,
        email=addEmailRequest.email
    )

    db.add(new_email)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already in use",
        )

    db.refresh(new_email)

    return {
        "message": "Email added successfully",
        "email": new_email.email,
        "id": new_email.id
    }


@router.delete("/deleteEmail", status_code=status.HTTP_200_OK)
def delete_Email(
    deleteEmailRequest: EmailRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing_email = db.scalar(
        select(Emails).where(
            Emails.user_id == user.id,
            Emails.email == deleteEmailRequest.email
        )
    )

    if existing_email is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not found"
        )

    db.delete(existing_email)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email cannot be deleted due to a database constraint"
        )

    return {
        "message": "Email deleted successfully"
    }