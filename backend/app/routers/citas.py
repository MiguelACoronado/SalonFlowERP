from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import ADMIN, RECEPCION, requiere_roles, usuario_actual
from app.schemas.citas import CambioEstado, CitaCrear, CitaOut, Disponibilidad, Estado
from app.services import citas as servicio

router = APIRouter(prefix="/citas", tags=["Agenda de citas"])
DB = Annotated[Session, Depends(get_db)]
Sesion = Annotated[object, Depends(usuario_actual)]
Personal = Annotated[object, Depends(requiere_roles(ADMIN, RECEPCION))]


@router.get("", response_model=list[CitaOut], summary="Agenda de un día (por defecto hoy)")
def listar(db: DB, usuario: Sesion, fecha: date | None = None,
           estilista_id: int | None = None, estado: Estado | None = None):
    return servicio.listar(db, usuario, fecha, estilista_id, estado)


@router.get("/disponibilidad", response_model=Disponibilidad, summary="Horas libres de un estilista")
def disponibilidad(fecha: date, estilista_id: int, db: DB, _: Sesion):
    return servicio.disponibilidad(db, fecha, estilista_id)


@router.post("", response_model=CitaOut, status_code=status.HTTP_201_CREATED)
def crear(datos: CitaCrear, db: DB, _: Personal):
    return servicio.crear(db, datos)


@router.patch("/{cita_id}/estado", response_model=CitaOut, summary="Confirmar, atender o cancelar")
def cambiar_estado(cita_id: int, datos: CambioEstado, db: DB, usuario: Sesion):
    return servicio.cambiar_estado(db, cita_id, datos.estado, usuario)
