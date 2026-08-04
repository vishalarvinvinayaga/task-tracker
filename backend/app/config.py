from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", extra="ignore")

    database_url: str = "postgresql+psycopg://planner:planner_local_dev@127.0.0.1:5432/planner_db"
    attachments_dir: str = "../data/attachments"
    cors_origins: str = "http://localhost:5173"
    host: str = "127.0.0.1"
    port: int = 8000

    @property
    def attachments_path(self) -> Path:
        path = (BACKEND_DIR / self.attachments_dir).resolve()
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
