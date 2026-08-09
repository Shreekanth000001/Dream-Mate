from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import List
from apps.api import models, schemas, auth
from apps.api.database import get_db
from packages.ai.gemini import GeminiProvider
from packages.ai.mock import MockProvider
from packages.ai.voice import ElevenLabsProvider, MockVoiceProvider
from apps.api.config import settings
from apps.api.routers.memories import consolidate_memories_task

router = APIRouter(prefix="/chat", tags=["chat"])

if settings.AI_PROVIDER == "mock":
    ai_provider = MockProvider()
    voice_provider = MockVoiceProvider()
else:
    ai_provider = GeminiProvider()
    voice_provider = ElevenLabsProvider()

class ChatRequest(BaseModel):
    message: str

class AvatarEmotion(BaseModel):
    emotion: str = "neutral"
    intensity: float = 0.5

class ChatResponse(BaseModel):
    reply: str
    avatar_emotion: AvatarEmotion
    take_break_suggested: bool = False

def generate_system_prompt(companion: models.Companion, dreams: List[models.Dream], tasks: List[models.Task], semantic_memories: List[str] = None) -> str:
    prompt = f"You are {companion.name}, a supportive AI companion. Your personality style is {companion.personality_style} and accountability style is {companion.accountability_style}.\n"
    prompt += "Your core philosophy is to help the user achieve their real-world dreams, NOT to keep them chatting endlessly. You care about them.\n"
    
    if dreams:
        prompt += f"The user's current dreams: {', '.join([d.title for d in dreams])}\n"
    
    pending_tasks = [t for t in tasks if t.status == 'pending']
    if pending_tasks:
        prompt += f"The user has {len(pending_tasks)} pending tasks, such as: {pending_tasks[0].title}.\n"
        
    if semantic_memories:
        prompt += f"Relevant past memories:\n" + "\n".join([f"- {m}" for m in semantic_memories]) + "\n"
        
    prompt += "If the user has been chatting for a while, gently encourage them to take a break and work on their dreams or go outside."
    return prompt

@router.post("/", response_model=ChatResponse)
def send_message(
    req: ChatRequest,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(auth.get_current_user), 
    db: Session = Depends(get_db)
):
    companion = db.query(models.Companion).filter(models.Companion.user_id == current_user.id).first()
    if not companion:
        raise HTTPException(status_code=404, detail="Companion not found. Create one first.")
        
    # Get active conversation or create one
    conversation = db.query(models.Conversation).filter(
        models.Conversation.user_id == current_user.id,
        models.Conversation.status == "active"
    ).order_by(models.Conversation.session_start.desc()).first()
    
    if not conversation:
        conversation = models.Conversation(user_id=current_user.id, companion_id=companion.id)
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        
    # Save user message
    user_msg = models.Message(conversation_id=conversation.id, role="user", content=req.message)
    db.add(user_msg)
    db.commit()
    
    # Fetch recent history
    history = db.query(models.Message).filter(models.Message.conversation_id == conversation.id).order_by(models.Message.created_at.asc()).limit(20).all()
    messages_formatted = [{"role": m.role, "content": m.content} for m in history]
    
    # Context gathering
    dreams = db.query(models.Dream).filter(models.Dream.user_id == current_user.id).all()
    tasks = db.query(models.Task).join(models.Goal).join(models.Dream).filter(models.Dream.user_id == current_user.id).all()
    
    # Semantic memory retrieval
    semantic_memories = []
    if "postgresql" in settings.DATABASE_URL:
        # Generate embedding for user message
        user_embedding = ai_provider.get_embedding(req.message)
        # Fetch top 5 closest memories
        closest_memories = db.query(models.Memory).filter(
            models.Memory.user_id == current_user.id,
            models.Memory.embedding.is_not(None)
        ).order_by(models.Memory.embedding.l2_distance(user_embedding)).limit(5).all()
        semantic_memories = [m.content for m in closest_memories]
    
    system_prompt = generate_system_prompt(companion, dreams, tasks, semantic_memories)
    
    # Generate AI response (which is now JSON)
    reply_json_str = ai_provider.generate_chat_response(system_prompt, messages_formatted)
    
    import json
    try:
        reply_data = json.loads(reply_json_str)
        reply_text = reply_data.get("message", "I didn't understand that.")
        avatar_emotion = reply_data.get("avatar_emotion", {"emotion": "neutral", "intensity": 0.5})
    except json.JSONDecodeError:
        reply_text = reply_json_str
        avatar_emotion = {"emotion": "neutral", "intensity": 0.5}
    
    # Save AI message
    ai_msg = models.Message(conversation_id=conversation.id, role="assistant", content=reply_text)
    db.add(ai_msg)
    
    # Update last interaction
    import datetime
    conversation.last_interaction_at = datetime.datetime.utcnow()
    db.commit()
    
    # Trigger memory consolidation periodically (e.g. every message for MVP, usually would be batched)
    background_tasks.add_task(consolidate_memories_task, current_user.id, conversation.id)
    
    # Very basic session duration check (healthy disengagement)
    session_duration_mins = (datetime.datetime.utcnow() - conversation.session_start).total_seconds() / 60
    take_break_suggested = session_duration_mins > 30
    
    return {
        "reply": reply_text, 
        "avatar_emotion": avatar_emotion,
        "take_break_suggested": take_break_suggested
    }

class VoiceRequest(BaseModel):
    text: str

@router.post("/voice")
def synthesize_voice(req: VoiceRequest, current_user: models.User = Depends(auth.get_current_user)):
    audio_base64 = voice_provider.synthesize(req.text)
    return {"audio_base64": audio_base64}
