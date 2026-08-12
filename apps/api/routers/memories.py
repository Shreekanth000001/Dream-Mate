from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from apps.api import models, schemas, auth
from apps.api.database import get_db, SessionLocal
from packages.ai.gemini import GeminiProvider
from packages.ai.mock import MockProvider
from apps.api.config import settings
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/memories", tags=["memories"])

if settings.AI_PROVIDER == "mock":
    ai_provider = MockProvider()
else:
    ai_provider = GeminiProvider()

def consolidate_memories_task(user_id: str, conversation_id: str):
    # This runs in the background
    db = SessionLocal()
    try:
        # Get recent messages
        recent_messages = db.query(models.Message).filter(
            models.Message.conversation_id == conversation_id
        ).order_by(models.Message.created_at.desc()).limit(10).all()
        
        if not recent_messages:
            return
            
        recent_messages.reverse()
        text_log = "\n".join([f"{m.role}: {m.content}" for m in recent_messages])
        
        extracted_memories = ai_provider.extract_memories(text_log)

        for item in extracted_memories:
            fact = item["content"]
            memory_type = item["type"]
            importance = item["importance"]
            expires_in_days = item["expires_in_days"]

            # Check if this exact memory already exists for the user
            existing = db.query(models.Memory).filter(
                models.Memory.user_id == user_id,
                models.Memory.content == fact
            ).first()

            if existing:
                continue

            # Calculate expiration date if provided
            expiration_at = None
            if expires_in_days is not None:
                try:
                    expiration_at = datetime.utcnow() + timedelta(days=float(expires_in_days))
                except (TypeError, ValueError):
                    expiration_at = None

            # Generate embedding for the new memory
            embedding = ai_provider.get_embedding(fact)

            # Create and stage the new memory record
            memory = models.Memory(
                user_id=user_id,
                content=fact,
                memory_type=memory_type,
                importance=importance,
                expiration_at=expiration_at,
                embedding=embedding,
            )
            db.add(memory)
                
        db.commit()
    finally:
        db.close()

@router.get("/", response_model=List[Dict[str, Any]])
def get_memories(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    memories = db.query(models.Memory).filter(models.Memory.user_id == current_user.id).all()
    # Format for UI
    return [{"id": m.id, "content": m.content, "type": m.memory_type, "importance": m.importance} for m in memories]

class AddMemoryRequest(BaseModel if 'BaseModel' in globals() else object):
    pass

from pydantic import BaseModel
class CreateMemoryRequest(BaseModel):
    content: str
    importance: int = 5
    memory_type: str = "recent"

@router.post("/", response_model=Dict[str, Any])
def add_memory(req: CreateMemoryRequest, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    embedding = ai_provider.get_embedding(req.content)
    memory = models.Memory(
        user_id=current_user.id,
        content=req.content,
        memory_type=req.memory_type,
        importance=req.importance,
        embedding=embedding
    )
    db.add(memory)
    db.commit()
    db.refresh(memory)
    return {"id": memory.id, "content": memory.content, "type": memory.memory_type, "importance": memory.importance}

@router.delete("/{memory_id}")
def delete_memory(memory_id: str, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    memory = db.query(models.Memory).filter(
        models.Memory.id == memory_id, 
        models.Memory.user_id == current_user.id
    ).first()
    
    if memory:
        db.delete(memory)
        db.commit()
    return {"status": "success"}

@router.post("/consolidate")
def consolidate_memories(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    """Run memory consolidation: classify importance and clean up low-value memories."""
    memories = db.query(models.Memory).filter(models.Memory.user_id == current_user.id).all()
    
    if not memories:
        return {"analyzed": 0, "retained": 0, "forgotten": 0, "details": []}
    
    details = []
    retained = 0
    forgotten = 0
    
    # Keywords that indicate long-term importance
    important_keywords = [
        "want", "goal", "dream", "love", "hate", "always", "never", "career",
        "become", "hobby", "interest", "family", "friend", "struggle", "passion",
        "prefer", "favorite", "afraid", "worry", "hope", "plan", "aspire"
    ]
    
    for memory in memories:
        content_lower = memory.content.lower()
        is_important = any(kw in content_lower for kw in important_keywords) or memory.importance >= 5
        
        if is_important:
            # Upgrade importance if not already high
            if memory.importance < 7:
                memory.importance = 7
            details.append({
                "content": memory.content,
                "action": "retained",
                "reason": "Long-term personal information"
            })
            retained += 1
        else:
            # Mark as low importance or delete
            details.append({
                "content": memory.content,
                "action": "forgotten",
                "reason": "Temporary or trivial information"
            })
            db.delete(memory)
            forgotten += 1
    
    db.commit()
    
    return {
        "analyzed": len(memories),
        "retained": retained,
        "forgotten": forgotten,
        "details": details
    }
