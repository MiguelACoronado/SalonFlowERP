from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import ADMIN, RECEPCION, requiere_roles
from app.schemas.inventario import MovimientoCrear, MovimientoOut, ProductoActualizar, ProductoCrear, ProductoOut
from app.services import inventario as servicio

router = APIRouter(prefix="/productos", tags=["Inventario"])
DB = Annotated[Session, Depends(get_db)]
Personal = Annotated[object, Depends(requiere_roles(ADMIN, RECEPCION))]


@router.get("", response_model=list[ProductoOut])
def listar(db: DB, _: Personal, solo_bajos: bool = False):
    return servicio.listar(db, solo_bajos)


@router.post("", response_model=ProductoOut, status_code=status.HTTP_201_CREATED)
def crear(datos: ProductoCrear, db: DB, _: Personal):
    return servicio.crear(db, datos)


@router.patch("/{producto_id}", response_model=ProductoOut)
def actualizar(producto_id: int, datos: ProductoActualizar, db: DB, _: Personal):
    return servicio.actualizar(db, producto_id, datos)


@router.post("/{producto_id}/movimientos", response_model=ProductoOut, summary="Entrada o salida de stock")
def movimiento(producto_id: int, datos: MovimientoCrear, db: DB, _: Personal):
    return servicio.registrar_movimiento(db, producto_id, datos)


@router.get("/{producto_id}/movimientos", response_model=list[MovimientoOut])
def movimientos(producto_id: int, db: DB, _: Personal):
    return servicio.movimientos(db, producto_id)
