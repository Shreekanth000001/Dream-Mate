import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from apps.api.config import settings

# Fallback to SQLite for MVP since Docker/Postgres is unavailable in this environment
DATABASE_URL = settings.DATABASE_URL

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
