import sys
sys.path.append('.')
from apps.api.database import SessionLocal
from apps.api import models

db = SessionLocal()
users = db.query(models.User).filter(models.User.email == 'shreekanth.k000001@gmail.com').all()
if users:
    for u in users:
        print(f"Closing active conversations for {u.email}")
        db.query(models.Conversation).filter(
            models.Conversation.user_id == u.id,
            models.Conversation.status == "active"
        ).update({"status": "closed"})
    db.commit()
    print("Done.")
