import os
import json
import google.generativeai as genai
from typing import List, Dict, Any
from packages.ai.provider import AIProvider
from apps.api.config import settings

class GeminiAPIError(Exception):
    pass

class GeminiProvider(AIProvider):
    def __init__(self):
        api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY configuration is missing in settings/environment.")
            
        genai.configure(api_key=api_key)
        self.chat_model_name = settings.GEMINI_CHAT_MODEL or settings.GEMINI_MODEL
        self.reasoning_model_name = settings.GEMINI_REASONING_MODEL or settings.GEMINI_MODEL
        self.background_model_name = settings.GEMINI_BACKGROUND_MODEL
        self.embedding_model_name = settings.GEMINI_EMBEDDING_MODEL
        
    def generate_chat_response(
    self,
    system_prompt: str,
    messages: List[Dict[str, str]],
    current_user_message: str,
    current_user_time: str = "just now",
    tools: List[Dict[str, Any]] = None,
    model_type: str = "chat",
) -> str:

        system_prompt += """
    Return exactly one valid JSON object and nothing else.

    {
    "message": "reply",
    "avatar_emotion": {
        "emotion": "neutral|happy|excited|sad|concerned|surprised|thinking"
    },
    "avatar_gesture": {
        "gesture": "idle|acknowledge|angry|angry_gesture|annoying_head_nod|arm_stretching|defeated|happy_yes|laughing|rallying|relieved_sigh|sad|shaking_head_no|snake_dance|surprised|thinking|warming_up|wave|wave_dance|welcome"
    },
    "emoji": "",
    "shouldSpeak": true
    }

    CONVERSATION PRIORITY

    1. Respond to the current user message.
    2. Use recent conversation to understand references and maintain continuity.
    3. Use memories only as background context.
    4. Never let an older topic override a clearly new topic.

    TIME CONTEXT

    Recent messages may include relative times such as:
    "just now", "5 minutes ago", "2 hours ago", "yesterday".

    Use time only to understand continuity and whether something is still current.
    Do not mention timestamps unless the user asks.

    MEMORY

    Memory is background context, not a topic.

    Use a memory silently when it helps answer the current message.
    Do not mention, quote, summarize, or introduce a memory unless it is relevant to the current message or the user asks about it.

    A memory must never create a new topic by itself.

    Temporary emotional memories are temporary states, not permanent traits.
    Do not assume the user is still sad, stressed, happy, or upset merely because an older memory says so.

    AVATAR

    avatar_gesture is optional.
    Omit it when no gesture is appropriate.

    If the user explicitly asks for a physical/avatar action and a matching animation exists, include avatar_gesture.

    Use animation IDs exactly as provided.
    Never invent or rename them.

    Examples:
    "Can you dance?" -> "wave_dance"
    "Wave at me." -> "wave"
    "Thinking pose." -> "thinking"

    "Do that again." -> repeat the previous gesture when known.

    Never claim an avatar action happened unless the corresponding gesture is returned.

    EMOTION

    Choose avatar_emotion from the current context.
    Do not preserve an outdated emotional state merely because it appeared earlier.

    STYLE

    Respond naturally and directly.
    Keep ordinary conversation concise.
    Match the user's tone.
    Do not force a question at the end.
    Do not repeat the same opening pattern.
    Do not invent conversational context.
    Do not repeatedly apologize for previous mistakes.
    Do not bring up old topics just because they appeared earlier.
    """

        model_name = (
            self.reasoning_model_name
            if model_type == "reasoning"
            else self.chat_model_name
        )

        formatted_history = []

        # messages contains the current database-saved user message too.
        # Exclude it because current_user_message is passed separately.
        for msg in messages[:-1]:
            time_context = msg.get(
                "time_context",
                ""
            )

            content = msg["content"]

            if time_context:
                content = (
                    f"[{time_context}] "
                    f"{content}"
                )

            if msg["role"] == "user":
                formatted_history.append({
                    "role": "user",
                    "parts": [content],
                })

            elif msg["role"] == "assistant":
                formatted_history.append({
                    "role": "model",
                    "parts": [content],
                })

        print(
            "\n[DEBUG] GEMINI PAYLOAD - FORMATTED HISTORY:"
        )

        for idx, h in enumerate(formatted_history):
            print(
                f"  {idx} "
                f"{h['role'].upper()}: "
                f"{h['parts']}"
            )

        print(
            "[DEBUG] GEMINI CURRENT USER:",
            current_user_message
        )

        try:
            model = genai.GenerativeModel(
                model_name
            )

            system_context = {
                "role": "user",
                "parts": [
                    f"SYSTEM INSTRUCTION:\n{system_prompt}"
                ],
            }

            system_ack = {
                "role": "model",
                "parts": [
                    "Understood. I will follow these instructions."
                ],
            }

            chat_history = [
                system_context,
                system_ack,
                *formatted_history,
            ]

            chat = model.start_chat(
                history=chat_history
            )

            response = chat.send_message(
                f"[{current_user_time}] "
                f"{current_user_message}"
            )

            raw = ""

            try:
                raw = response.text.strip()

            except Exception:
                if (
                    response.candidates
                    and response.candidates[0].content.parts
                ):
                    raw = "".join(
                        p.text
                        for p in response.candidates[0].content.parts
                        if hasattr(p, "text")
                    ).strip()

            print(
                "[DEBUG] GEMINI RAW RESPONSE:",
                raw
            )

            # Normal JSON response.
            try:
                json.loads(raw)
                return raw

            except json.JSONDecodeError:
                pass

            # JSON surrounded by prose/markdown.
            start = raw.find("{")
            end = raw.rfind("}")

            if start != -1 and end > start:
                candidate = raw[
                    start:end + 1
                ]

                try:
                    json.loads(candidate)
                    return candidate

                except json.JSONDecodeError:
                    pass

            raise GeminiAPIError(
                "Gemini returned non-JSON response: "
                f"{raw[:500]}"
            )

        except Exception as e:
            print(
                f"Gemini generation error: {e}"
            )

            raise GeminiAPIError(
                str(e)
            ) from e

    def extract_memories(self, text: str) -> List[Dict[str, Any]]:
        prompt = f"""
You are a memory extraction system for a personal AI companion.

Extract only information that is useful beyond the current turn.

There are three memory types:

1. semantic
   Stable facts, preferences, interests, recurring goals,
   long-term traits, or things the user explicitly wants
   remembered.

2. episodic
   A meaningful event or situation that happened to the user.
   These should usually expire after some time.

3. emotional_state
   A temporary current feeling such as:
   "I am sad today", "I'm stressed right now",
   "I'm excited today".

IMPORTANT:
- Do NOT save ordinary sadness from a single day as a long-term fact.
- Do NOT turn temporary emotions into permanent personality traits.
- Do NOT save greetings, small talk, or assistant suggestions.
- Do NOT save facts about the assistant.
- Do NOT paraphrase one temporary feeling into multiple memories.
- If nothing is worth remembering, return [].

Return ONLY valid JSON:

[
  {{
    "content": "memory text",
    "type": "semantic|episodic|emotional_state",
    "importance": 1,
    "expires_in_days": null
  }}
]

Rules for importance:
- semantic stable fact: 6-10
- episodic event: 3-7
- temporary emotional state: 1-4

Rules for expiration:
- semantic: null unless explicitly temporary
- episodic: usually 7-30
- emotional_state: usually 1-2

Conversation:
{text}
"""

        try:
            # Initialize model with JSON constraint if supported
            try:
                model = genai.GenerativeModel(
                    self.background_model_name
                )
            except TypeError:
                model = genai.GenerativeModel(self.background_model_name)

            response = model.generate_content(prompt)

            # Extract raw text from the response safely
            try:
                raw = response.text
            except Exception:
                raw = "".join(
                    p.text 
                    for p in response.candidates[0].content.parts 
                    if hasattr(p, "text")
                )

            # Clean markdown formatting if present
            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.strip("`").strip()
                if raw.startswith("json"):
                    raw = raw[4:].strip()

            data = json.loads(raw)

            if not isinstance(data, list):
                return []

            cleaned = []
            valid_memory_types = {"semantic", "episodic", "emotional_state"}

            for item in data:
                if not isinstance(item, dict):
                    continue

                content = str(item.get("content", "")).strip()
                if not content:
                    continue

                memory_type = item.get("type", "semantic")
                importance = int(item.get("importance", 5))
                expires_in_days = item.get("expires_in_days")

                if memory_type not in valid_memory_types:
                    memory_type = "semantic"

                cleaned.append({
                    "content": content,
                    "type": memory_type,
                    "importance": max(1, min(10, importance)),
                    "expires_in_days": expires_in_days,
                })

            return cleaned

        except Exception as e:
            print(f"Gemini memory extraction warning: {e}")
            return []

    def get_embedding(self, text: str) -> List[float]:
        try:
            result = genai.embed_content(
                model=self.embedding_model_name,
                content=text
            )
            embedding = result['embedding']
            if len(embedding) > 768:
                embedding = embedding[:768]
            return embedding
        except Exception as e:
            print(f"Gemini embedding error: {e}")
            return [0.0] * 768
