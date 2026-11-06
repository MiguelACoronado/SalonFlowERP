from datetime import datetime

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.catalogo import Servicio


class Cliente(Base):
    __tablename__ = "clientes"
    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(120))
    telefono: Mapped[str] = mapped_column(String(20))
    servicio_frecuente_id: Mapped[int | None] = mapped_column(ForeignKey("servicios.id"))
    creado_en: Mapped[datetime] = mapped_column(server_default="now()")

    servicio_frecuente: Mapped[Servicio | None] = relationship(lazy="joined")
