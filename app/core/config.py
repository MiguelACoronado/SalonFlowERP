"""Configuración de la aplicación, leída de variables de entorno o del archivo .env."""
from functools import lru_cache
from zoneinfo import ZoneInfo

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Cadena de conexión a PostgreSQL (Supabase o local).
    database_url: str = "postgresql://postgres:postgres@localhost:5432/salonflow"

    # Autenticación JWT
    jwt_secret: str = "cambia-esta-clave-en-produccion"
    jwt_algoritmo: str = "HS256"
    jwt_minutos: int = 480  # una jornada laboral

    # Orígenes permitidos para el frontend (separados por coma)
    cors_origins: str = "http://localhost:5173"

    zona_horaria: str = "America/Bogota"

    @property
    def sqlalchemy_url(self) -> str:
        """SQLAlchemy necesita el prefijo del driver psycopg 3."""
        url = self.database_url
        for prefijo in ("postgresql://", "postgres://"):
            if url.startswith(prefijo):
                return "postgresql+psycopg://" + url[len(prefijo):]
        return url

    @property
    def tz(self) -> ZoneInfo:
        return ZoneInfo(self.zona_horaria)

    @property
    def lista_cors(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
