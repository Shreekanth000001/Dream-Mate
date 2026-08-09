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
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        
    def generate_chat_response(
        self, 
        system_prompt: str, 
        messages: List[Dict[str, str]], 
        tools: List[Dict[str, Any]] = None
    ) -> str:
        # Convert our standard message format to Gemini's format
        history = []
        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            history.append({"role": role, "parts": [msg["content"]]})
            
        system_prompt += "\n\nCRITICAL INSTRUCTION: You must respond in valid JSON format. The JSON schema should be:\n"
        system_prompt += "{\n"
        system_prompt += "  \"message\": \"your text reply\",\n"
        system_prompt += "  \"avatar_emotion\": {\"emotion\": \"neutral|happy|excited|sad|concerned|empathetic|encouraging|proud|curious|thinking|surprised|calm|frustrated|sleepy\", \"intensity\": 0.0-1.0},\n"
        system_prompt += "  \"shouldSpeak\": true  // set to true unless it's a very trivial acknowledgement\n"
        system_prompt += "}"
        
        # In a real app we would use system_instruction in GenerativeModel
        model = genai.GenerativeModel(
            'gemini-1.5-flash',
            system_instruction=system_prompt,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json",
            )
        )
        
        try:
            chat = model.start_chat(history=history[:-1] if history else [])
            last_message = history[-1]["parts"][0] if history else "Hello"
            response = chat.send_message(last_message)
            return response.text
        except Exception as e:
            print(f"Gemini error: {e}")
            return '{"message": "I\'m having trouble processing that right now. Could we talk about your goals instead?", "avatar_emotion": {"emotion": "concerned", "intensity": 0.5}}'

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
            response = self.model.generate_content(prompt)
            # Parse bullets
            lines = [line.strip("- *").strip() for line in response.text.split("\n") if line.strip("- *").strip()]
            return lines
        except Exception:
            return []

    def get_embedding(self, text: str) -> List[float]:
        try:
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=text
            )
            return result['embedding']
        except Exception as e:
            print(f"Gemini embedding error: {e}")
            return [0.0] * 768
