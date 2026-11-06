"""Acceso a datos: estilistas, servicios, categorías y configuración."""
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import CategoriaProducto, Configuracion, Estilista, Servicio


def estilistas(db: Session, solo_activos: bool = True) -> list[Estilista]:
    q = select(Estilista).order_by(Estilista.id)
    if solo_activos:
        q = q.where(Estilista.activo)
    return list(db.scalars(q))


def servicios(db: Session, solo_activos: bool = True) -> list[Servicio]:
    q = select(Servicio).order_by(Servicio.id)
    if solo_activos:
        q = q.where(Servicio.activo)
    return list(db.scalars(q))


def servicio_por_nombre(db: Session, nombre: str) -> Servicio | None:
    return db.scalar(select(Servicio).where(func.lower(Servicio.nombre) == nombre.strip().lower()))


def categorias(db: Session) -> list[CategoriaProducto]:
    return list(db.scalars(select(CategoriaProducto).order_by(CategoriaProducto.id)))


def parametro(db: Session, clave: str) -> Decimal:
    return db.scalar(select(Configuracion.valor).where(Configuracion.clave == clave))


def guardar_parametro(db: Session, clave: str, valor: Decimal) -> None:
    conf = db.get(Configuracion, clave)
    conf.valor = valor
    db.flush()
