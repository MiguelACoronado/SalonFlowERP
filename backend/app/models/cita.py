from datetime import date, datetime, time
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.catalogo import Estilista, Servicio
from app.models.cliente import Cliente

ESTADOS = ("Pendiente", "Confirmada", "Atendida", "Cancelada")


class Cita(Base):
    __tablename__ = "citas"
    id: Mapped[int] = mapped_column(primary_key=True)
    fecha: Mapped[date]
    hora: Mapped[time]
    cliente_id: Mapped[int] = mapped_column(ForeignKey("clientes.id"))
    servicio_id: Mapped[int] = mapped_column(ForeignKey("servicios.id"))
    estilista_id: Mapped[int] = mapped_column(ForeignKey("estilistas.id"))
    estado: Mapped[str] = mapped_column(String(12), default="Pendiente")
    precio: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    creado_en: Mapped[datetime] = mapped_column(server_default="now()")

    cliente: Mapped[Cliente] = relationship(lazy="joined")
    servicio: Mapped[Servicio] = relationship(lazy="joined")
    estilista: Mapped[Estilista] = relationship(lazy="joined")
