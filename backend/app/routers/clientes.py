from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import ADMIN, RECEPCION, requiere_roles
from app.schemas.citas import CitaOut
from app.schemas.clientes import ClienteActualizar, ClienteCrear, ClienteOut
from app.services import clientes as servicio

router = APIRouter(prefix="/clientes", tags=["Clientes"])
DB = Annotated[Session, Depends(get_db)]
Personal = Annotated[object, Depends(requiere_roles(ADMIN, RECEPCION))]


@router.get("", response_model=list[ClienteOut], summary="Listar o buscar por nombre/teléfono")
def listar(db: DB, _: Personal, q: Annotated[str | None, Query(max_length=60)] = None):
    return servicio.listar(db, q)


@router.post("", response_model=ClienteOut, status_code=status.HTTP_201_CREATED)
def crear(datos: ClienteCrear, db: DB, _: Personal):
    return servicio.crear(db, datos)


@router.get("/{cliente_id}", response_model=ClienteOut)
def detalle(cliente_id: int, db: DB, _: Personal):
    return servicio.detalle(db, cliente_id)


@router.patch("/{cliente_id}", response_model=ClienteOut)
def actualizar(cliente_id: int, datos: ClienteActualizar, db: DB, _: Personal):
    return servicio.actualizar(db, cliente_id, datos)


@router.get("/{cliente_id}/historial", response_model=list[CitaOut], summary="Historial de servicios del cliente")
def historial(cliente_id: int, db: DB, _: Personal):
    return servicio.historial(db, cliente_id)
