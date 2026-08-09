import os
import google.generativeai as genai
from typing import List, Dict, Any
from packages.ai.provider import AIProvider

class GeminiProvider(AIProvider):
    def __init__(self):
        # Retrieve the API key from environment
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
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
            
        system_prompt += "\n\nCRITICAL INSTRUCTION: You must respond in valid JSON format. The JSON schema should be: {\"message\": \"your text reply\", \"avatar_emotion\": {\"emotion\": \"neutral|happy|excited|sad|concerned|empathetic|encouraging|proud|curious|thinking|surprised|calm\", \"intensity\": 0.0-1.0}}"
        
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
        Extract the most important facts, goals, or preferences from the following text.
        Return them as a simple bulleted list.
        Text: {text}
        """
        try:
            response = self.model.generate_content(prompt)
            # Parse bullets
            lines = [line.strip("- *").strip() for line in response.text.split("\n") if line.strip("- *").strip()]
            return lines
        except Exception:
            return []
