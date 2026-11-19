from datetime import date, datetime
from decimal import Decimal

from app.schemas.comunes import Esquema


class ClienteEnRiesgo(Esquema):
    id: int                      # id de la predicción (para marcar como contactado)
    cliente_id: int
    cliente: str
    telefono: str
    dias_desde_ultima: int
    intervalo_promedio: Decimal
    num_visitas: int
    gasto_promedio: Decimal
    probabilidad: Decimal
    en_riesgo: bool
    contactado: bool
    contactado_en: datetime | None


class ClientesEnRiesgoOut(Esquema):
    fecha_calculo: date | None
    actualizada: bool            # False si se muestra una lista de un día anterior
    version_modelo: str | None
    evaluados: int
    en_riesgo: int
    clientes: list[ClienteEnRiesgo]
    aviso: str | None            # mensaje cuando el servicio de IA no respondió


class ContactadoIn(Esquema):
    contactado: bool = True


class ContactadoOut(Esquema):
    id: int
    contactado: bool
    contactado_en: datetime | None
