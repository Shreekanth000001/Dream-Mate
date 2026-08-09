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
        tools: List[Dict[str, Any]] = None,
        model_type: str = "chat"
    ) -> str:
        system_prompt += "\n\nCRITICAL INSTRUCTION: You must respond in valid JSON format. The JSON schema should be:\n"
        system_prompt += "{\n"
        system_prompt += "  \"message\": \"your text reply\",\n"
        system_prompt += "  \"avatar_emotion\": {\"emotion\": \"neutral|happy|excited|sad|concerned|surprised|thinking\"},\n"
        system_prompt += "  \"avatar_gesture\": {\"gesture\": \"none|open_hands|small_wave|thinking|point|emphasis\"},\n"
        system_prompt += "  \"emoji\": \"😊\",\n"
        system_prompt += "  \"shouldSpeak\": true\n"
        system_prompt += "}"
        
        model_name = self.reasoning_model_name if model_type == "reasoning" else self.chat_model_name

        # Convert past messages into Gemini history format
        # Past assistant messages are wrapped in JSON strings matching the schema
        formatted_history = []
        if len(messages) > 1:
            for msg in messages[:-1]:
                if msg["role"] == "user":
                    formatted_history.append({"role": "user", "parts": [msg["content"]]})
                else:
                    assistant_json = json.dumps({
                        "message": msg["content"],
                        "avatar_emotion": {"emotion": "happy"},
                        "avatar_gesture": {"gesture": "open_hands"},
                        "emoji": "",
                        "shouldSpeak": True
                    })
                    formatted_history.append({"role": "model", "parts": [assistant_json]})

        current_user_msg = messages[-1]["content"] if messages else "Hello"
        prompt_with_instruction = f"SYSTEM INSTRUCTION:\n{system_prompt}\n\nUSER MESSAGE:\n{current_user_msg}"
        
        print("\n[DEBUG] GEMINI PAYLOAD - FORMATTED HISTORY:")
        for idx, h in enumerate(formatted_history):
            print(f"  {idx} {h['role'].upper()}: {h['parts']}")
        print(f"[DEBUG] GEMINI PAYLOAD - PROMPT_WITH_INSTRUCTION:\n{prompt_with_instruction}\n")
        
        try:
            try:
                model = genai.GenerativeModel(
                    model_name,
                    system_instruction=system_prompt,
                    generation_config={"response_mime_type": "application/json"}
                )
            except TypeError:
                model = genai.GenerativeModel(model_name)

            chat = model.start_chat(history=formatted_history)
            response = chat.send_message(prompt_with_instruction)
            try:
                return response.text
            except Exception:
                if response.candidates and response.candidates[0].content.parts:
                    return "".join([p.text for p in response.candidates[0].content.parts if hasattr(p, "text")])
                raise
        except Exception as e:
            print(f"Gemini generation error: {e}")
            raise GeminiAPIError(f"{e}") from e

    def extract_memories(self, text: str) -> List[str]:
        prompt = f"""
        Extract ONLY the most important long-term facts, goals, preferences, or recurring obstacles from the following conversation.
        DO NOT extract temporary conversational noise, greetings, or trivial short-term information.
        If there is nothing of long-term importance, return an empty response.
        Return them as a simple bulleted list.
        Conversation:
        {text}
        """
        try:
            model = genai.GenerativeModel(self.background_model_name)
            response = model.generate_content(prompt)
            res_text = ""
            try:
                res_text = response.text
            except Exception:
                if response.candidates and response.candidates[0].content.parts:
                    res_text = "".join([p.text for p in response.candidates[0].content.parts if hasattr(p, "text")])
            
            lines = [line.strip("- *").strip() for line in res_text.split("\n") if line.strip("- *").strip()]
            return lines
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
