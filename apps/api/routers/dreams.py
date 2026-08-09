from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from apps.api import models, schemas, auth
from apps.api.database import get_db

router = APIRouter(prefix="/dreams", tags=["dreams"])

@router.get("/", response_model=List[schemas.DreamResponse])
def get_dreams(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Dream).filter(models.Dream.user_id == current_user.id).all()

@router.post("/", response_model=schemas.DreamResponse)
def create_dream(
    dream: schemas.DreamCreate, 
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(get_db)
):
    new_dream = models.Dream(
        user_id=current_user.id,
        title=dream.title,
        description=dream.description
    )
    db.add(new_dream)
    db.commit()
    db.refresh(new_dream)
    return new_dream

@router.get("/{dream_id}/goals", response_model=List[schemas.GoalResponse])
def get_goals(
    dream_id: str,
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(get_db)
):
    dream = db.query(models.Dream).filter(models.Dream.id == dream_id, models.Dream.user_id == current_user.id).first()
    if not dream:
        raise HTTPException(status_code=404, detail="Dream not found")
        
    return db.query(models.Goal).filter(models.Goal.dream_id == dream_id).all()

@router.post("/{dream_id}/goals", response_model=schemas.GoalResponse)
def create_goal(
    dream_id: str,
    goal: schemas.GoalCreate, 
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(get_db)
):
    dream = db.query(models.Dream).filter(models.Dream.id == dream_id, models.Dream.user_id == current_user.id).first()
    if not dream:
        raise HTTPException(status_code=404, detail="Dream not found")
        
    new_goal = models.Goal(
        dream_id=dream_id,
        title=goal.title
    )
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)
    return new_goal
