from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    GEMINI_API_KEY: str | None = None
    AI_PROVIDER: str = "gemini"
    DATABASE_URL: str = "sqlite:///./dreammate.db"
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
