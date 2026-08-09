import pytest
from unittest.mock import patch, MagicMock, ANY
from apps.api.config import settings
from packages.ai.gemini import GeminiProvider

@pytest.fixture
def mock_genai():
    with patch('packages.ai.gemini.genai') as mock:
        mock.GenerativeModel.return_value.start_chat.return_value.send_message.return_value.text = '{"message": "test", "shouldSpeak": true, "avatar_emotion": {"emotion": "neutral", "intensity": 0.5}}'
        mock.GenerativeModel.return_value.generate_content.return_value.text = "- memory fact 1"
        mock.embed_content.return_value = {"embedding": [0.1] * 768}
        yield mock

def test_model_configuration_is_dynamic(mock_genai):
    """Prove model configuration can be changed without modifying application code."""
    settings.GEMINI_CHAT_MODEL = "test-chat-model"
    settings.GEMINI_REASONING_MODEL = "test-reason-model"
    settings.GEMINI_BACKGROUND_MODEL = "test-background-model"
    settings.GEMINI_EMBEDDING_MODEL = "test-embed-model"
    
    provider = GeminiProvider()
    assert provider.chat_model_name == "test-chat-model"
    assert provider.reasoning_model_name == "test-reason-model"
    assert provider.background_model_name == "test-background-model"
    assert provider.embedding_model_name == "test-embed-model"

def test_normal_chat_uses_chat_model(mock_genai):
    provider = GeminiProvider()
    provider.chat_model_name = "chat-model-v1"
    
    provider.generate_chat_response("system", [{"role": "user", "content": "hello"}], model_type="chat")
    
    mock_genai.GenerativeModel.assert_called_with(
        "chat-model-v1",
        system_instruction=ANY,
        generation_config=ANY
    )

def test_complex_reasoning_uses_reasoning_model(mock_genai):
    provider = GeminiProvider()
    provider.reasoning_model_name = "reason-model-v1"
    
    provider.generate_chat_response("system", [{"role": "user", "content": "let's plan a complex strategy"}], model_type="reasoning")
    
    mock_genai.GenerativeModel.assert_called_with(
        "reason-model-v1",
        system_instruction=ANY,
        generation_config=ANY
    )

def test_memory_processing_uses_background_model(mock_genai):
    provider = GeminiProvider()
    provider.background_model_name = "background-model-v1"
    
    provider.extract_memories("Here is a conversation")
    
    mock_genai.GenerativeModel.assert_called_with("background-model-v1")
    mock_genai.GenerativeModel().generate_content.assert_called()

def test_embedding_calls_use_embedding_model(mock_genai):
    provider = GeminiProvider()
    provider.embedding_model_name = "embed-model-v1"
    
    provider.get_embedding("hello world")
    
    mock_genai.embed_content.assert_called_with(
        model="embed-model-v1",
        content="hello world"
    )
