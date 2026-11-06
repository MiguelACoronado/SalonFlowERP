from datetime import date

from pydantic import field_validator

from app.schemas.comunes import Esquema, normalizar_telefono, validar_nombre_persona


class ClienteCrear(Esquema):
    nombre: str
    telefono: str
    servicio_frecuente_id: int | None = None

    _n = field_validator("nombre")(validar_nombre_persona)
    _t = field_validator("telefono")(normalizar_telefono)


class ClienteActualizar(Esquema):
    nombre: str | None = None
    telefono: str | None = None
    servicio_frecuente_id: int | None = None

    @field_validator("nombre")
    @classmethod
    def _n(cls, v):
        return validar_nombre_persona(v) if v is not None else v

    @field_validator("telefono")
    @classmethod
    def _t(cls, v):
        return normalizar_telefono(v) if v is not None else v


class ClienteOut(Esquema):
    id: int
    nombre: str
    telefono: str
    servicio_frecuente_id: int | None
    servicio_frecuente: str | None
    ultima_visita: date | None
    dias_sin_visita: int | None
