from abc import ABC, abstractmethod
from typing import List, Dict, Any

class AIProvider(ABC):
    
    @abstractmethod
    def generate_chat_response(
        self, 
        system_prompt: str, 
        messages: List[Dict[str, str]], 
        tools: List[Dict[str, Any]] = None
    ) -> str:
        """Generates a chat response from the model."""
        pass
        
    @abstractmethod
    def extract_memories(self, text: str) -> List[str]:
        """Extracts key facts/memories from a text string."""
        pass
