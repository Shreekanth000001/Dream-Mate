from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from apps.api import models, schemas, auth
from apps.api.database import get_db

router = APIRouter(prefix="/companion", tags=["companion"])

@router.get("/", response_model=schemas.CompanionResponse)
def get_companion(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    companion = db.query(models.Companion).filter(models.Companion.user_id == current_user.id).first()
    if not companion:
        raise HTTPException(status_code=404, detail="Companion not found")
    return companion

@router.post("/", response_model=schemas.CompanionResponse)
def create_companion(
    companion: schemas.CompanionCreate, 
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(get_db)
):
    existing = db.query(models.Companion).filter(models.Companion.user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already has a companion")
    
    new_companion = models.Companion(
        user_id=current_user.id,
        name=companion.name,
        appearance=companion.appearance,
        personality_style=companion.personality_style,
        accountability_style=companion.accountability_style
    )
    db.add(new_companion)
    db.commit()
    db.refresh(new_companion)
    return new_companion

@router.patch("/", response_model=schemas.CompanionResponse)
def update_companion(
    companion_update: schemas.CompanionCreate, 
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(get_db)
):
    companion = db.query(models.Companion).filter(models.Companion.user_id == current_user.id).first()
    if not companion:
        raise HTTPException(status_code=404, detail="Companion not found")
        
    companion.name = companion_update.name
    companion.appearance = companion_update.appearance
    companion.personality_style = companion_update.personality_style
    companion.accountability_style = companion_update.accountability_style
    
    db.commit()
    db.refresh(companion)
    return companion
