"""Predicciones del servicio de IA de clientes en riesgo (RF-14)."""
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PrediccionRiesgo(Base):
    __tablename__ = "prediccion_riesgo"
    id: Mapped[int] = mapped_column(primary_key=True)
    cliente_id: Mapped[int] = mapped_column(ForeignKey("clientes.id"))
    fecha_calculo: Mapped[date]
    dias_desde_ultima: Mapped[int]
    intervalo_promedio: Mapped[Decimal] = mapped_column(Numeric(8, 2))
    num_visitas: Mapped[int]
    gasto_promedio: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    probabilidad: Mapped[Decimal] = mapped_column(Numeric(5, 4))
    en_riesgo: Mapped[bool]
    version_modelo: Mapped[str]
    contactado: Mapped[bool] = mapped_column(default=False)
    contactado_en: Mapped[datetime | None]
    calculado_en: Mapped[datetime] = mapped_column(server_default="now()")
