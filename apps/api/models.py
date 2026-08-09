import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, JSON
from sqlalchemy.orm import relationship
from apps.api.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    companion = relationship("Companion", back_populates="user", uselist=False)
    dreams = relationship("Dream", back_populates="user")
    memories = relationship("Memory", back_populates="user")

class Companion(Base):
    __tablename__ = "companions"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    name = Column(String, default="DreamMate")
    appearance = Column(JSON, default=dict)
    personality_style = Column(String, default="supportive")
    accountability_style = Column(String, default="balanced")
    
    user = relationship("User", back_populates="companion")
    conversations = relationship("Conversation", back_populates="companion")

class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    companion_id = Column(String, ForeignKey("companions.id"))
    session_start = Column(DateTime, default=datetime.utcnow)
    last_interaction_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="active")

    companion = relationship("Companion", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation")

class Message(Base):
    __tablename__ = "messages"
    id = Column(String, primary_key=True, default=generate_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id"))
    role = Column(String) # 'user' or 'assistant'
    content = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    conversation = relationship("Conversation", back_populates="messages")

class Memory(Base):
    __tablename__ = "memories"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    content = Column(String)
    memory_type = Column(String) # 'working', 'episodic', 'semantic'
    importance = Column(Integer, default=1)
    expiration_at = Column(DateTime, nullable=True)
    embedding = Column(JSON) # Storing as JSON array for SQLite since pgvector isn't available
    
    user = relationship("User", back_populates="memories")

class Dream(Base):
    __tablename__ = "dreams"
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    title = Column(String)
    description = Column(String, nullable=True)
    status = Column(String, default="active")
    
    user = relationship("User", back_populates="dreams")
    goals = relationship("Goal", back_populates="dream")

class Goal(Base):
    __tablename__ = "goals"
    id = Column(String, primary_key=True, default=generate_uuid)
    dream_id = Column(String, ForeignKey("dreams.id"))
    title = Column(String)
    status = Column(String, default="active")
    
    dream = relationship("Dream", back_populates="goals")
    tasks = relationship("Task", back_populates="goal")

class Task(Base):
    __tablename__ = "tasks"
    id = Column(String, primary_key=True, default=generate_uuid)
    goal_id = Column(String, ForeignKey("goals.id"))
    title = Column(String)
    duration_minutes = Column(Integer, nullable=True)
    status = Column(String, default="pending")
    due_date = Column(DateTime, nullable=True)
    
    goal = relationship("Goal", back_populates="tasks")
