from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any, List
from datetime import datetime

# --- User ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    created_at: datetime
    
    class Config:
        from_attributes = True

# --- Companion ---
class CompanionCreate(BaseModel):
    name: str = "DreamMate"
    appearance: Dict[str, Any] = {}
    personality_style: str = "supportive"
    accountability_style: str = "balanced"

class CompanionResponse(CompanionCreate):
    id: str
    user_id: str
    
    class Config:
        from_attributes = True

# --- Dream / Goal / Task ---
class DreamCreate(BaseModel):
    title: str
    description: Optional[str] = None

class DreamResponse(DreamCreate):
    id: str
    status: str
    
    class Config:
        from_attributes = True

class GoalCreate(BaseModel):
    title: str
    dream_id: str

class GoalResponse(GoalCreate):
    id: str
    status: str
    
    class Config:
        from_attributes = True

class TaskCreate(BaseModel):
    title: str
    goal_id: str
    duration_minutes: Optional[int] = None
    due_date: Optional[datetime] = None

class TaskResponse(TaskCreate):
    id: str
    status: str
    
    class Config:
        from_attributes = True

# --- Auth ---
class Token(BaseModel):
    access_token: str
    token_type: str
