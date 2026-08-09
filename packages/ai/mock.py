from typing import List, Dict, Any
from packages.ai.provider import AIProvider

class MockProvider(AIProvider):
    def generate_chat_response(self, system_prompt: str, messages: List[Dict[str, str]], tools: List[Dict[str, Any]] = None) -> str:
        return '{"message": "This is a mock AI response for testing.", "avatar_emotion": {"emotion": "neutral", "intensity": 0.5}}'

    def extract_memories(self, text: str) -> List[str]:
        return ["Mock memory extracted for testing"]

    def get_embedding(self, text: str) -> List[float]:
        # Return a mock 768-dimensional vector
        return [0.0] * 768
