"""Acceso a datos de citas."""
from datetime import date, time

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Cita


def listar(db: Session, fecha: date | None = None, estilista_id: int | None = None,
           estado: str | None = None, cliente_id: int | None = None, limite: int = 500) -> list[Cita]:
    q = select(Cita)
    if fecha:
        q = q.where(Cita.fecha == fecha)
    if estilista_id:
        q = q.where(Cita.estilista_id == estilista_id)
    if estado:
        q = q.where(Cita.estado == estado)
    if cliente_id:
        q = q.where(Cita.cliente_id == cliente_id)
    q = q.order_by(Cita.fecha.desc() if cliente_id else Cita.fecha, Cita.hora).limit(limite)
    return list(db.scalars(q).unique())


def obtener(db: Session, cita_id: int) -> Cita | None:
    return db.get(Cita, cita_id)


def hay_conflicto(db: Session, estilista_id: int, fecha: date, hora: time) -> bool:
    q = select(Cita.id).where(Cita.estilista_id == estilista_id, Cita.fecha == fecha,
                              Cita.hora == hora, Cita.estado != "Cancelada")
    return db.scalar(q) is not None


def horas_ocupadas(db: Session, estilista_id: int, fecha: date) -> set[time]:
    q = select(Cita.hora).where(Cita.estilista_id == estilista_id, Cita.fecha == fecha,
                                Cita.estado != "Cancelada")
    return set(db.scalars(q))


def crear(db: Session, **datos) -> Cita:
    cita = Cita(**datos)
    db.add(cita)
    db.flush()
    db.refresh(cita)
    return cita
