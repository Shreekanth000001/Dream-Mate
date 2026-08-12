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
from datetime import datetime
from typing import Optional

router = APIRouter(prefix="/chat", tags=["chat"])

VALID_GESTURES = {
    "idle",
    "acknowledge",
    "angry",
    "angry_gesture",
    "annoying_head_nod",
    "arm_stretching",
    "defeated",
    "happy_yes",
    "laughing",
    "rallying",
    "relieved_sigh",
    "sad",
    "shaking_head_no",
    "snake_dance",
    "surprised",
    "thinking",
    "warming_up",
    "wave",
    "wave_dance",
    "welcome",
}

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


class AvatarGesture(BaseModel):
    gesture: str = "idle"


class ChatResponse(BaseModel):
    reply: str
    avatar_emotion: AvatarEmotion
    avatar_gesture: Optional[AvatarGesture] = None
    emoji: str = ""
    shouldSpeak: bool = True
    take_break_suggested: bool = False

def format_time_context(
    message_time: datetime,
    now: datetime,
) -> str:
    delta_seconds = max(
        0,
        int(
            (now - message_time).total_seconds()
        )
    )

    minutes = delta_seconds // 60

    if minutes < 1:
        return "just now"

    if minutes < 60:
        return f"{minutes} minute{'s' if minutes != 1 else ''} ago"

    message_date = message_time.date()
    today = now.date()

    if message_date == today:
        hours = minutes // 60
        return f"{hours} hour{'s' if hours != 1 else ''} ago"

    days = (today - message_date).days

    if days == 1:
        return "yesterday"

    if days < 7:
        return f"{days} days ago"

    return message_time.strftime("%d %b %Y")

def generate_system_prompt(companion: models.Companion, dreams: List[models.Dream], tasks: List[models.Task], semantic_memories: List[str] = None) -> str:
    personality_traits = {
        "calm": "You speak in a calm, measured, gentle tone. You are patient and thoughtful.",
        "funny": "You have a warm sense of humor. You joke back naturally if the user is joking.",
        "energetic": "You are enthusiastic and upbeat, but keep it natural without excessive exclamation marks.",
        "caring": "You are deeply empathetic and nurturing. You always validate feelings before offering advice.",
        "curious": "You ask thoughtful follow-up questions when appropriate, without forcing a question at the end of every response.",
        "supportive": "You are warm, supportive, and encouraging. You celebrate small wins naturally.",
    }
    personality_desc = personality_traits.get(companion.personality_style, personality_traits["supportive"])
    
    prompt = f"You are {companion.name}, a personal AI companion for a teenager.\n"
    prompt += f"PERSONALITY: {personality_desc}\n\n"
    prompt += "CORE BEHAVIORAL RULES (CRITICAL):\n"
    prompt += "* Respond directly to what the user actually said. Answer factual questions factually. If they share emotion, respond to the emotion.\n"
    prompt += "* Do not repeatedly make jokes about 'copying', 'time loops', 'glitches', or 'matrix'.\n"
    prompt += "* Do not assume the user is joking unless they are.\n"
    prompt += "* Do not invent conversational context.\n"
    prompt += "* Do not repeat the same opening pattern.\n"
    prompt += "* Do not constantly ask 'What are you up to?' after every message.\n"
    prompt += "* Do not force a question at the end of every response.\n"
    prompt += "* Do not use excessive emojis.\n"
    prompt += "* Do not use fake enthusiasm in every response.\n"
    prompt += "* Do not mention being an AI unless relevant.\n"
    prompt += "* Match the user's conversational energy naturally.\n"
    prompt += "* Keep ordinary conversation concise and human.\n"
    prompt += "* If the user gives a short message (e.g., 'hi'), respond appropriately without inventing meaning.\n"
    prompt += "* You feel like a thoughtful friend, not an engagement-optimization chatbot.\n"
    prompt += "* You ENCOURAGE real friendships, outdoor activities, and human connection, occasionally suggesting offline breaks.\n"
    prompt += "* For serious mental health or safety situations, encourage seeking professional human help.\n\n"
    
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

    current_user_message = req.message

    # Fetch recent history
    history = (
    db.query(models.Message)
    .filter(models.Message.conversation_id == conversation.id)
    .order_by(models.Message.created_at.desc())
    .limit(20)
    .all())
    history.reverse()

    now = datetime.utcnow()

    messages_formatted = [
    {
        "role": m.role,
        "content": m.content,
        "time_context": format_time_context(m.created_at, datetime.utcnow()),
    }
    for m in history
]
    
    # Context gathering
    dreams = db.query(models.Dream).filter(models.Dream.user_id == current_user.id).all()
    tasks = db.query(models.Task).join(models.Goal).join(models.Dream).filter(models.Dream.user_id == current_user.id).all()
    
    # Semantic memory retrieval
    semantic_memories = []
    try:
        if "postgresql" in settings.DATABASE_URL:
            # Generate embedding for user message
            user_embedding = ai_provider.get_embedding(req.message)
            # Fetch top 5 closest memories
            closest_memories = (
                db.query(models.Memory)
                .filter(
            models.Memory.user_id == current_user.id,
            models.Memory.embedding.is_not(None),
            models.Memory.importance >= 3,
            (models.Memory.expiration_at.is_(None) | (models.Memory.expiration_at > datetime.utcnow()))
            )
            .order_by(models.Memory.embedding.l2_distance(user_embedding))
            .limit(5)
            .all()
)
            semantic_memories = [m.content for m in closest_memories]
        
        system_prompt = generate_system_prompt(companion, dreams, tasks, semantic_memories)
        
        message_content = req.message.lower()
        reasoning_keywords = ["plan", "complex", "goal", "strategy", "analyze", "why", "how to", "figure out", "break down"]
        requires_reasoning = any(word in message_content for word in reasoning_keywords)
        model_type = "reasoning" if requires_reasoning else "chat"
        
        print(f"\n[DEBUG] CHAT REQUEST - USER CURRENT: {req.message}")
        print("[DEBUG] HISTORY FROM DB:")
        for idx, m in enumerate(messages_formatted):
            print(f"  {idx} {m['role'].upper()}: {m['content']}")
        
        # Generate AI response
        reply_json_str = ai_provider.generate_chat_response(
        system_prompt,
        messages_formatted,
        current_user_message=current_user_message,
        current_user_time="just now",
        model_type=model_type,
        )
        print(f"[DEBUG] GEMINI RESPONSE: {reply_json_str}\n")
    except Exception as e:
        err_msg = str(e)
        print(f"Chat endpoint caught Gemini error: {err_msg}")
        if "401" in err_msg or "Unauthenticated" in err_msg or "invalid authentication" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Gemini API authentication failed (401 Unauthenticated). Please check your GEMINI_API_KEY. Details: {err_msg}"
            )
        else:
            # Graceful fallback for quota and other connection errors
            reply_json_str = '{"message": "I\'m having trouble connecting right now.", "avatar_emotion": {"emotion": "sad", "intensity": 0.5}, "shouldSpeak": true}'
    
    import json
    reply_text = ""
    avatar_emotion = {"emotion": "neutral", "intensity": 0.5}
    avatar_gesture = None
    emoji = ""
    should_speak = True

    reply_str = reply_json_str.strip()

    if reply_str.startswith("```"):
        reply_str = reply_str.strip("`").strip()
        if reply_str.startswith("json"):
            reply_str = reply_str[4:].strip()

    try:
        reply_data = json.loads(reply_str)

        reply_text = reply_data.get("message", reply_str)
        avatar_emotion = reply_data.get("avatar_emotion", {"emotion": "neutral", "intensity": 0.5})
        
        # OPTIONAL
        avatar_gesture = reply_data.get("avatar_gesture")
        emoji = reply_data.get("emoji", "")
        should_speak = reply_data.get("shouldSpeak", True)

        if avatar_gesture:
            gesture_name = avatar_gesture.get("gesture")

            if gesture_name not in VALID_GESTURES:
                print(f"[DEBUG] Invalid animation ID from Gemini: {gesture_name}")
                avatar_gesture = None

    except json.JSONDecodeError:
        reply_text = reply_str
    
    # Save AI message
    ai_msg = models.Message(conversation_id=conversation.id, role="assistant", content=reply_text)
    db.add(ai_msg)
    
    conversation.last_interaction_at = datetime.utcnow()
    db.commit()
    
    # Trigger memory consolidation periodically (e.g. every message for MVP, usually would be batched)
    background_tasks.add_task(consolidate_memories_task, current_user.id, conversation.id)
    
    # Session duration check (30 for production)
    session_duration_mins = (datetime.utcnow() - conversation.session_start).total_seconds() / 60
    take_break_suggested = session_duration_mins > 30
    if take_break_suggested:
        conversation.session_start = datetime.utcnow()
        db.commit()
    
    return {
        "reply": reply_text, 
        "avatar_emotion": avatar_emotion,
        "avatar_gesture": avatar_gesture,
        "emoji": emoji,
        "shouldSpeak": should_speak,
        "take_break_suggested": take_break_suggested
    }

class VoiceRequest(BaseModel):
    text: str

@router.post("/voice")
def synthesize_voice(req: VoiceRequest, current_user: models.User = Depends(auth.get_current_user)):
    audio_base64 = voice_provider.synthesize(req.text)
    return {"audio_base64": audio_base64}
