# DREAMMATE MVP

DREAMMATE is a customizable 3D AI companion that acts as a supportive friend, accountability partner, and goal/dream coach. 
Crucially, DREAMMATE is designed **NOT to maximize engagement**, but instead helps users achieve their real-world goals and encourages healthy disengagement.

## Problem
Most AI companions and social media platforms are optimized for screen time and engagement, leading to unhealthy dependency. They isolate users from the real world.

## Solution
DREAMMATE actively tracks user sessions. If a user spends too much time chatting, DREAMMATE will gently suggest they take a break, work on their real-world goals, or go outside. It remembers their long-term dreams and holds them accountable without being abusive or manipulative.

## Prerequisites
- Node.js 18+
- Python 3.12+

## Environment Setup

The AI capabilities of DreamMate rely on the Gemini API. To run it locally:

1. Copy the example environment file:
   ```bash
   cp apps/api/.env.example apps/api/.env
   ```
2. Edit `apps/api/.env` and add your real Gemini API key:
   ```env
   GEMINI_API_KEY="your_actual_key_here"
   DATABASE_URL="sqlite:///./dreammate.db"
   AI_PROVIDER="gemini"
   ```

*(Note: The actual `.env` file is git-ignored and should never be committed.)*

## Getting Started
- **Frontend**: Next.js App Router, Tailwind CSS, shadcn/ui.
- **Backend**: FastAPI, SQLAlchemy, Pydantic.
- **Database**: SQLite (MVP Fallback for restricted environments).
- **AI**: Gemini 1.5 Flash via `google-generativeai`.

## Running Locally
1. Start the API backend:
   ```bash
   python -m venv venv
   source venv/bin/activate
   pip install -r apps/api/requirements.txt
   export PYTHONPATH=$(pwd)
   uvicorn apps.api.main:app --reload --host 0.0.0.0 --port 8000
   ```
2. Start the Web frontend:
   ```bash
   cd apps/web
   npm install
   npm run dev
   ```
3. Open `http://localhost:3000`

## Core Systems
- **AI Architecture**: Provider abstraction allowing Gemini, Claude, or OpenAI.
- **Memory System**: Context injection with working memory and semantic extraction.
- **Accountability System**: Goals and tasks are tracked and fed into the AI's system prompt so it can ask about them naturally.
- **Safety Philosophy**: Explicit guardrails against dependency-maximizing language and active session interruption (Healthy Disengagement Engine).
