from datetime import date, datetime

from pydantic import field_validator

from app.schemas.comunes import Esquema, normalizar_telefono, validar_nombre_persona


class ClienteCrear(Esquema):
    nombre: str
    telefono: str
    servicio_frecuente_id: int | None = None
    # Ley 1581, art. 9: sin autorización previa del cliente no se registran sus datos.
    autoriza_datos: bool

    _n = field_validator("nombre")(validar_nombre_persona)
    _t = field_validator("telefono")(normalizar_telefono)

    @field_validator("autoriza_datos")
    @classmethod
    def _autoriza(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Sin la autorización del cliente no se pueden registrar sus datos (Ley 1581 de 2012).")
        return v


class ClienteActualizar(Esquema):
    nombre: str | None = None
    telefono: str | None = None
    servicio_frecuente_id: int | None = None
    autoriza_datos: bool | None = None  # False = el cliente revocó la autorización (art. 8, lit. e)

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
    autoriza_datos: bool
    fecha_autorizacion: datetime | None
    version_politica: str | None


class AvisoPrivacidad(Esquema):
    version: str
    responsable: str
    contacto: str
    datos: list[str]
    finalidades: list[str]
    almacenamiento: str
    derechos: str
    texto: str
