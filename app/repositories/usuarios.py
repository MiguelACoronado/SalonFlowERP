"""Acceso a datos de usuarios."""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Usuario


def por_email(db: Session, email: str) -> Usuario | None:
    return db.scalar(select(Usuario).where(func.lower(Usuario.email) == email.strip().lower()))


def listar(db: Session) -> list[Usuario]:
    return list(db.scalars(select(Usuario).order_by(Usuario.id)))


def obtener(db: Session, usuario_id: int) -> Usuario | None:
    return db.get(Usuario, usuario_id)


def crear(db: Session, **datos) -> Usuario:
    u = Usuario(**datos)
    db.add(u)
    db.flush()
    return u
