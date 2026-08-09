import sys
sys.path.append('.')
from apps.api.database import SessionLocal
from apps.api import models

db = SessionLocal()
conv = db.query(models.Conversation).order_by(models.Conversation.session_start.desc()).first()
print(f"Latest Conversation ID: {conv.id} for User {conv.user_id}")

messages = db.query(models.Message).filter(models.Message.conversation_id == conv.id).order_by(models.Message.created_at.asc()).all()
print("\nMessages in this conversation:")
for m in messages:
    print(f"[{m.role.upper()}] {m.content}")
