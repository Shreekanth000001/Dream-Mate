from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from apps.api import models, schemas, auth
from apps.api.database import get_db, SessionLocal
from packages.ai.gemini import GeminiProvider

router = APIRouter(prefix="/memories", tags=["memories"])
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
        
        extracted_facts = ai_provider.extract_memories(text_log)
        
        for fact in extracted_facts:
            # Basic deduplication / importance scoring (simulated for MVP)
            existing = db.query(models.Memory).filter(
                models.Memory.user_id == user_id, 
                models.Memory.content == fact
            ).first()
            
            if not existing:
                memory = models.Memory(
                    user_id=user_id,
                    content=fact,
                    memory_type="recent",
                    importance=5
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
