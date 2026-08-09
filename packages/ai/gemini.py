import os
import google.generativeai as genai
from typing import List, Dict, Any
from packages.ai.provider import AIProvider
from apps.api.config import settings

class GeminiProvider(AIProvider):
    def __init__(self):
        # Retrieve the API key from environment via Pydantic settings
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            raise ValueError("GEMINI_API_KEY configuration is missing. AI functionality cannot be used.")
            
        genai.configure(api_key=api_key)
        self.chat_model_name = settings.GEMINI_CHAT_MODEL
        self.reasoning_model_name = settings.GEMINI_REASONING_MODEL
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
        system_prompt += "  \"avatar_emotion\": {\"emotion\": \"neutral|happy|excited|sad|concerned|empathetic|encouraging|proud|curious|thinking|surprised|calm|frustrated|sleepy\", \"intensity\": 0.0-1.0},\n"
        system_prompt += "  \"shouldSpeak\": true  // set to true unless it's a very trivial acknowledgement\n"
        system_prompt += "}"
        
        history = [
            {"role": "user", "parts": [f"SYSTEM INSTRUCTION:\n{system_prompt}"]},
            {"role": "model", "parts": ['{"message": "Understood. I will act as your supportive companion.", "avatar_emotion": {"emotion": "neutral", "intensity": 0.5}, "shouldSpeak": false}']}
        ]
        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            history.append({"role": role, "parts": [msg["content"]]})
            
        model_name = self.reasoning_model_name if model_type == "reasoning" else self.chat_model_name
        
        try:
            try:
                model = genai.GenerativeModel(
                    model_name,
                    system_instruction=system_prompt,
                    generation_config={"response_mime_type": "application/json"}
                )
                chat_history = history[2:] if len(history) > 2 else []
            except TypeError:
                model = genai.GenerativeModel(model_name)
                chat_history = history
                
            chat = model.start_chat(history=chat_history[:-1] if chat_history else [])
            last_message = chat_history[-1]["parts"][0] if chat_history else "Hello"
            response = chat.send_message(last_message)
            return response.text
        except Exception as e:
            print(f"Gemini error: {e}")
            return '{"message": "I\'m having trouble processing that right now. Could we talk about your goals instead?", "avatar_emotion": {"emotion": "concerned", "intensity": 0.5}, "shouldSpeak": true}'

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
            # Parse bullets
            lines = [line.strip("- *").strip() for line in response.text.split("\n") if line.strip("- *").strip()]
            return lines
        except Exception:
            return []

    def get_embedding(self, text: str) -> List[float]:
        try:
            result = genai.embed_content(
                model=self.embedding_model_name,
                content=text
            )
            return result['embedding']
        except Exception as e:
            print(f"Gemini embedding error: {e}")
            return [0.0] * 768
