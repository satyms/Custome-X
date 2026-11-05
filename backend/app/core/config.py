from pathlib import Path
from typing import List, Union, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
_ENV_PATH = _BACKEND_DIR / ".env"


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    HOST: str = "127.0.0.1"
    CORS_ORIGINS: Union[List[str], str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # Supabase / Database
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""
    DATABASE_URL: str

    # Connection pool configuration
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 5
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 300

    # AI Orchestrator & LLM settings
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"
    ANTHROPIC_API_KEY: Optional[str] = None
    ANTHROPIC_MODEL: str = "claude-3-7-sonnet-20250219"
    AI_FALLBACK_PROVIDER: str = "gemini"
    MAX_INPUT_TOKENS: int = 4096
    MAX_OUTPUT_TOKENS: int = 2048
    MAX_MESSAGE_LENGTH: int = 2000
    REFUND_AUTONOMOUS_THRESHOLD_CENTS: int = 5000  # $50.00
    RETURN_WINDOW_DAYS: int = 30
    ALLOWED_URL_HOSTS: Union[List[str], str] = [
        "customex.io",
        "shop.customex.io",
        "track.customex.io",
        "fedex.com",
        "ups.com",
        "usps.com",
    ]

    @property
    def cors_origins_list(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, list):
            return self.CORS_ORIGINS
        if isinstance(self.CORS_ORIGINS, str):
            return [x.strip() for x in self.CORS_ORIGINS.split(",") if x.strip()]
        return ["http://localhost:5173", "http://127.0.0.1:5173"]

    @property
    def allowed_url_hosts_list(self) -> List[str]:
        if isinstance(self.ALLOWED_URL_HOSTS, list):
            return self.ALLOWED_URL_HOSTS
        if isinstance(self.ALLOWED_URL_HOSTS, str):
            return [x.strip() for x in self.ALLOWED_URL_HOSTS.split(",") if x.strip()]
        return ["customex.io", "shop.customex.io", "track.customex.io", "fedex.com", "ups.com", "usps.com"]

    model_config = SettingsConfigDict(
        env_file=(_ENV_PATH, ".env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
