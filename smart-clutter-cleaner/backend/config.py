"""Application configuration, loaded from environment / .env file."""
from pathlib import Path
from urllib.parse import quote_plus

from pydantic_settings import BaseSettings, SettingsConfigDict

APP_HOME = Path.home() / ".clutter_cleaner"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    db_host: str = "127.0.0.1"
    db_port: int = 3306
    db_user: str = "clutter_user"
    db_password: str = ""
    db_name: str = "clutter_cleaner"

    quarantine_dir: str = ""
    ollama_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "llama3.2"
    cors_origins: str = "http://localhost:5173"

    @property
    def database_url(self) -> str:
        return (
            f"mysql+pymysql://{quote_plus(self.db_user)}:{quote_plus(self.db_password)}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}?charset=utf8mb4"
        )

    @property
    def quarantine_path(self) -> Path:
        path = Path(self.quarantine_dir) if self.quarantine_dir else APP_HOME / "quarantine"
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
