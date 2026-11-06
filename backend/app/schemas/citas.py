from datetime import date, time
from decimal import Decimal
from typing import Literal

from app.schemas.comunes import Esquema

Estado = Literal["Pendiente", "Confirmada", "Atendida", "Cancelada"]


class CitaCrear(Esquema):
    fecha: date
    hora: time
    cliente_id: int
    servicio_id: int
    estilista_id: int


class CambioEstado(Esquema):
    estado: Estado


class CitaOut(Esquema):
    id: int
    fecha: date
    hora: time
    cliente_id: int
    cliente: str
    servicio_id: int
    servicio: str
    estilista_id: int
    estilista: str
    estado: Estado
    precio: Decimal


class Disponibilidad(Esquema):
    fecha: date
    estilista_id: int
    horas_libres: list[str]
