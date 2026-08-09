from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from apps.api import models, schemas, auth
from apps.api.database import get_db

router = APIRouter(prefix="/tasks", tags=["tasks"])

@router.get("/", response_model=List[schemas.TaskResponse])
def get_tasks(
    goal_id: str = None,
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(get_db)
):
    query = db.query(models.Task).join(models.Goal).join(models.Dream).filter(models.Dream.user_id == current_user.id)
    if goal_id:
        query = query.filter(models.Task.goal_id == goal_id)
        
    return query.all()

@router.post("/", response_model=schemas.TaskResponse)
def create_task(
    task: schemas.TaskCreate, 
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(get_db)
):
    goal = db.query(models.Goal).join(models.Dream).filter(
        models.Goal.id == task.goal_id,
        models.Dream.user_id == current_user.id
    ).first()
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
        
    new_task = models.Task(
        goal_id=task.goal_id,
        title=task.title,
        duration_minutes=task.duration_minutes,
        due_date=task.due_date
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task

@router.patch("/{task_id}", response_model=schemas.TaskResponse)
def update_task(
    task_id: str,
    status: str,
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(get_db)
):
    task = db.query(models.Task).join(models.Goal).join(models.Dream).filter(
        models.Task.id == task_id,
        models.Dream.user_id == current_user.id
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    task.status = status
    db.commit()
    db.refresh(task)
    return task
