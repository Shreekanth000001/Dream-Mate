from abc import ABC, abstractmethod
from typing import List, Dict, Any

class AIProvider(ABC):
    
    @abstractmethod
    def generate_chat_response(
        self, 
        system_prompt: str, 
        messages: List[Dict[str, str]], 
        tools: List[Dict[str, Any]] = None,
        model_type: str = "chat"
    ) -> str:
        """Generates a chat response from the model."""
        pass
        
    @abstractmethod
    def extract_memories(self, text: str) -> List[str]:
        """Extracts key facts/memories from a text string."""
        pass

    @abstractmethod
    def get_embedding(self, text: str) -> List[float]:
        """Generates an embedding for the given text."""
        pass
