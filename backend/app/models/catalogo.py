"""Catálogos: estilistas, servicios y parámetros del negocio."""
from decimal import Decimal

from sqlalchemy import Boolean, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Estilista(Base):
    __tablename__ = "estilistas"
    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100))
    activo: Mapped[bool] = mapped_column(Boolean, default=True)


class Servicio(Base):
    __tablename__ = "servicios"
    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100))
    precio: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    activo: Mapped[bool] = mapped_column(Boolean, default=True)


class Configuracion(Base):
    __tablename__ = "configuracion"
    clave: Mapped[str] = mapped_column(String(40), primary_key=True)
    valor: Mapped[Decimal] = mapped_column(Numeric)
    descripcion: Mapped[str | None]
