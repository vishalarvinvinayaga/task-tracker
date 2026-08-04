from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import UserProfile
from app.schemas import UserProfileCreate, UserProfileRead, UserProfileUpdate

router = APIRouter(prefix="/api/profile", tags=["profile"])


def _get(db: Session) -> UserProfile | None:
    return db.execute(select(UserProfile)).scalar_one_or_none()


@router.get("", response_model=UserProfileRead | None)
def get_profile(db: Session = Depends(get_db)):
    return _get(db)


@router.post("", response_model=UserProfileRead, status_code=201)
def create_profile(payload: UserProfileCreate, db: Session = Depends(get_db)):
    if _get(db):
        raise HTTPException(409, "Profile already set up — use PUT to update it")
    profile = UserProfile(**payload.model_dump())
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.put("", response_model=UserProfileRead)
def update_profile(payload: UserProfileUpdate, db: Session = Depends(get_db)):
    profile = _get(db)
    if not profile:
        raise HTTPException(404, "No profile set up yet — POST to create one")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, key, value)
    db.commit()
    db.refresh(profile)
    return profile
