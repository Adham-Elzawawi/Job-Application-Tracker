
from fastapi import APIRouter, Depends

from ..dependencies import get_current_user
from ..models import User

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me")
def read_current_user(user: User = Depends(get_current_user)):
    return {"id": user.id, "name": user.name, "email": user.email}
