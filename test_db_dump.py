import sys
import json
sys.path.append('.')
from apps.api.database import SessionLocal
from apps.api import models

db = SessionLocal()

users = db.query(models.User).all()
for u in users:
    conv = db.query(models.Conversation).filter(
        models.Conversation.user_id == u.id, 
        models.Conversation.status == "active"
    ).order_by(models.Conversation.session_start.desc()).first()
    
    if conv:
        messages = db.query(models.Message).filter(models.Message.conversation_id == conv.id).order_by(models.Message.created_at.asc()).all()
        print(f"\n--- User {u.email} Active Conversation ---")
        for m in messages:
            print(f"{m.role.upper()}: {m.content}")

