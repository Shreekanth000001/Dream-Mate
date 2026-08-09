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
    shouldSpeak: bool = True
    take_break_suggested: bool = False

def generate_system_prompt(companion: models.Companion, dreams: List[models.Dream], tasks: List[models.Task], semantic_memories: List[str] = None) -> str:
    personality_traits = {
        "calm": "You speak in a calm, measured, gentle tone. You are patient and thoughtful.",
        "funny": "You have a warm sense of humor. You use light jokes and playful language to keep things fun.",
        "energetic": "You are enthusiastic and upbeat! You use exclamation marks and encouraging energy.",
        "caring": "You are deeply empathetic and nurturing. You always validate feelings before offering advice.",
        "curious": "You ask thoughtful follow-up questions. You are genuinely interested in learning about the user.",
        "supportive": "You are warm, supportive, and encouraging. You celebrate small wins.",
    }
    personality_desc = personality_traits.get(companion.personality_style, personality_traits["supportive"])
    
    prompt = f"You are {companion.name}, a personal AI companion for a teenager.\n"
    prompt += f"PERSONALITY: {personality_desc}\n\n"
    prompt += "CORE RULES:\n"
    prompt += "- You are warm, supportive, conversational, and non-judgmental.\n"
    prompt += "- You do NOT pretend to be human. You are an AI companion and you are honest about it.\n"
    prompt += "- You do NOT claim to be a therapist or medical professional.\n"
    prompt += "- You do NOT encourage emotional dependency. Never say things like 'I'm all you need' or 'Don't leave me.'\n"
    prompt += "- You ENCOURAGE real friendships, family relationships, hobbies, outdoor activities, and human connection.\n"
    prompt += "- You occasionally suggest taking breaks from the app.\n"
    prompt += "- For serious mental health or safety situations, encourage seeking appropriate human/professional help.\n"
    prompt += "- You remember meaningful long-term information about the user.\n"
    prompt += "- You feel intelligent and emotionally aware, not robotic.\n\n"
    
    if dreams:
        prompt += f"The user's current dreams/goals: {', '.join([d.title for d in dreams])}\n"
    
    pending_tasks = [t for t in tasks if t.status == 'pending']
    if pending_tasks:
        prompt += f"Pending tasks: {', '.join([t.title for t in pending_tasks[:3]])}\n"
        
    if semantic_memories:
        prompt += "Things you remember about this user:\n" + "\n".join([f"- {m}" for m in semantic_memories]) + "\n"
    
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
    
    # Determine model routing based on content complexity
    message_content = req.message.lower()
    reasoning_keywords = ["plan", "complex", "goal", "strategy", "analyze", "why", "how to", "figure out", "break down"]
    requires_reasoning = any(word in message_content for word in reasoning_keywords)
    model_type = "reasoning" if requires_reasoning else "chat"
    
    # Generate AI response
    reply_json_str = ai_provider.generate_chat_response(system_prompt, messages_formatted, model_type=model_type)
    
    import json
    try:
        reply_data = json.loads(reply_json_str)
        reply_text = reply_data.get("message", "I didn't understand that.")
        avatar_emotion = reply_data.get("avatar_emotion", {"emotion": "neutral", "intensity": 0.5})
        should_speak = reply_data.get("shouldSpeak", True)
    except json.JSONDecodeError:
        reply_text = reply_json_str
        avatar_emotion = {"emotion": "neutral", "intensity": 0.5}
        should_speak = True
    
    # Save AI message
    ai_msg = models.Message(conversation_id=conversation.id, role="assistant", content=reply_text)
    db.add(ai_msg)
    
    # Update last interaction
    import datetime
    conversation.last_interaction_at = datetime.datetime.utcnow()
    db.commit()
    
    # Trigger memory consolidation periodically (e.g. every message for MVP, usually would be batched)
    background_tasks.add_task(consolidate_memories_task, current_user.id, conversation.id)
    
    # Session duration check (2 minutes for demo, 30 for production)
    session_duration_mins = (datetime.datetime.utcnow() - conversation.session_start).total_seconds() / 60
    take_break_suggested = session_duration_mins > 2
    
    return {
        "reply": reply_text, 
        "avatar_emotion": avatar_emotion,
        "shouldSpeak": should_speak,
        "take_break_suggested": take_break_suggested
    }

class VoiceRequest(BaseModel):
    text: str

@router.post("/voice")
def synthesize_voice(req: VoiceRequest, current_user: models.User = Depends(auth.get_current_user)):
    audio_base64 = voice_provider.synthesize(req.text)
    return {"audio_base64": audio_base64}
