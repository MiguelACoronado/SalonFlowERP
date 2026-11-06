"""Errores de la aplicación y su traducción a respuestas HTTP.

Todas las respuestas de error tienen la misma forma:
    {"detalle": "mensaje para el usuario", "errores": [{"campo": ..., "mensaje": ...}]}
"""
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, OperationalError

log = logging.getLogger("salonflow")


class AppError(Exception):
    status_code = 400

    def __init__(self, detalle: str, errores: list[dict] | None = None):
        super().__init__(detalle)
        self.detalle = detalle
        self.errores = errores or []


class NoEncontrado(AppError):
    status_code = 404


class Conflicto(AppError):
    status_code = 409


class ReglaNegocio(AppError):
    status_code = 422


class NoAutenticado(AppError):
    status_code = 401


class Prohibido(AppError):
    status_code = 403


# Mensajes amigables para las restricciones definidas en la base de datos.
MENSAJES_RESTRICCIONES = {
    "ux_citas_sin_cruce": "El estilista ya tiene una cita activa en ese horario.",
    "ux_clientes_nombre": "Ya existe un cliente con ese nombre.",
    "ux_usuarios_email": "Ya existe un usuario con ese correo.",
    "usuarios_estilista_id_key": "Ese estilista ya tiene un usuario asignado.",
    "productos_nombre_key": "Ya existe un producto con ese nombre.",
    "servicios_nombre_key": "Ya existe un servicio con ese nombre.",
}

MENSAJES_PYDANTIC = {
    "missing": "Este campo es obligatorio.",
    "string_too_short": "Es demasiado corto.",
    "string_too_long": "Es demasiado largo.",
    "int_parsing": "Debe ser un número entero.",
    "decimal_parsing": "Debe ser un número.",
    "float_parsing": "Debe ser un número.",
    "date_from_datetime_parsing": "Fecha inválida (formato AAAA-MM-DD).",
    "date_parsing": "Fecha inválida (formato AAAA-MM-DD).",
    "time_parsing": "Hora inválida (formato HH:MM).",
    "literal_error": "Valor no permitido.",
    "enum": "Valor no permitido.",
    "json_invalid": "El cuerpo de la petición no es JSON válido.",
}


def _mensaje_validacion(err: dict) -> str:
    tipo = err.get("type", "")
    if tipo == "value_error":
        # Mensajes propios de los validadores: "Value error, <mensaje>"
        return str(err.get("msg", "")).removeprefix("Value error, ")
    if tipo in ("greater_than_equal", "greater_than", "less_than_equal", "less_than"):
        limite = next(iter((err.get("ctx") or {}).values()), "")
        simbolo = {"greater_than_equal": "≥", "greater_than": ">", "less_than_equal": "≤", "less_than": "<"}[tipo]
        return f"Debe ser {simbolo} {limite}."
    return MENSAJES_PYDANTIC.get(tipo, str(err.get("msg", "Valor inválido.")))


def registrar_manejadores(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError):
        return JSONResponse(status_code=exc.status_code,
                            content={"detalle": exc.detalle, "errores": exc.errores})

    @app.exception_handler(RequestValidationError)
    async def _validacion(_: Request, exc: RequestValidationError):
        errores = []
        for e in exc.errors():
            loc = [str(p) for p in e.get("loc", []) if p not in ("body", "query", "path")]
            errores.append({"campo": ".".join(loc) or "general", "mensaje": _mensaje_validacion(e)})
        return JSONResponse(status_code=422,
                            content={"detalle": "Revisa los datos enviados.", "errores": errores})

    @app.exception_handler(IntegrityError)
    async def _integridad(_: Request, exc: IntegrityError):
        nombre = getattr(getattr(exc.orig, "diag", None), "constraint_name", None)
        mensaje = MENSAJES_RESTRICCIONES.get(nombre or "", "La operación viola una regla de la base de datos.")
        log.warning("IntegrityError %s: %s", nombre, exc.orig)
        return JSONResponse(status_code=409, content={"detalle": mensaje, "errores": []})

    @app.exception_handler(OperationalError)
    async def _bd_caida(_: Request, exc: OperationalError):
        log.error("Base de datos no disponible: %s", exc)
        return JSONResponse(status_code=503,
                            content={"detalle": "La base de datos no está disponible. Intenta más tarde.", "errores": []})

    @app.exception_handler(Exception)
    async def _inesperado(_: Request, exc: Exception):
        log.exception("Error no controlado")
        return JSONResponse(status_code=500,
                            content={"detalle": "Ocurrió un error inesperado.", "errores": []})
