import base64
import httpx
from abc import ABC, abstractmethod
from typing import Optional
from apps.api.config import settings

class VoiceProvider(ABC):
    @abstractmethod
    def synthesize(self, text: str) -> Optional[str]:
        """Synthesizes text to speech and returns a base64 encoded mp3 string. Returns None if unavailable."""
        pass

class MockVoiceProvider(VoiceProvider):
    def synthesize(self, text: str) -> Optional[str]:
        # Return a tiny mock base64 audio string or None
        return None

class ElevenLabsProvider(VoiceProvider):
    def __init__(self):
        self.api_key = settings.ELEVENLABS_API_KEY
        self.voice_id = settings.ELEVENLABS_VOICE_ID
        
    def synthesize(self, text: str) -> Optional[str]:
        if not self.api_key:
            return None
            
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{self.voice_id}"
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": self.api_key
        }
        data = {
            "text": text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.5
            }
        }
        
        try:
            with httpx.Client() as client:
                response = client.post(url, json=data, headers=headers, timeout=10.0)
                response.raise_for_status()
                return base64.b64encode(response.content).decode("utf-8")
        except Exception as e:
            print(f"ElevenLabs TTS error: {e}")
            return None
