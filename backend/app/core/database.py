"""Conexión a PostgreSQL con SQLAlchemy (capa de datos)."""
from collections.abc import Generator
from datetime import date, datetime

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.sqlalchemy_url,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=5,
    # El pooler de Supabase (modo transacción) no admite sentencias preparadas.
    connect_args={"prepare_threshold": None},
)


@event.listens_for(engine, "connect")
def _zona_horaria(dbapi_conn, _record):
    # CURRENT_DATE en las vistas y funciones debe ser la fecha de Colombia.
    with dbapi_conn.cursor() as cur:
        cur.execute(f"SET TIME ZONE '{settings.zona_horaria}'")


SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def hoy() -> date:
    return datetime.now(settings.tz).date()


def ahora() -> datetime:
    return datetime.now(settings.tz)
