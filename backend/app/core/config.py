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

    # Responsable del tratamiento de datos (el salón). Aparece en el aviso de privacidad (Ley 1581, art. 12).
    responsable_nombre: str = "SalonFlow (salón de demostración)"
    responsable_contacto: str = "privacidad@salonflow.co"

    # Servicio de IA de clientes en riesgo (carpeta ia/ del repositorio).
    ia_url: str = "http://127.0.0.1:8001"
    ia_api_key: str = ""            # si el servicio define IA_API_KEY, poner aquí la misma clave
    ia_timeout_segundos: float = 10  # Tabla 8: tiempo máximo de espera de 10 s

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
