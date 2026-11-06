from datetime import date
from decimal import Decimal

from app.schemas.comunes import Esquema


class FilaComision(Esquema):
    estilista: str
    servicios: int
    total: Decimal
    comision: Decimal


class ComisionesOut(Esquema):
    tasa: Decimal
    filas: list[FilaComision]
    totales: FilaComision
    desde: date
    hasta: date


class ResumenOut(Esquema):
    ingresos: Decimal
    servicios_realizados: int
    ticket_promedio: Decimal


class ServicioPopular(Esquema):
    servicio: str
    cantidad: int


class OcupacionDia(Esquema):
    num_dia: int
    dia: str
    pct: Decimal | None

