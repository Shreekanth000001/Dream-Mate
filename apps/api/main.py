from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager

from apps.api.database import get_db, engine, Base
from apps.api import models, schemas

# We would use Alembic in a real setup, but for MVP speed we'll create all tables on startup if they don't exist.
# However, for pgvector we need to ensure the extension exists first.
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield

from apps.api.routers import auth as auth_router, companion, dreams, tasks, chat, memories

app = FastAPI(title="DREAMMATE API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(companion.router)
app.include_router(dreams.router)
app.include_router(tasks.router)
app.include_router(chat.router)
app.include_router(memories.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to DREAMMATE API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
