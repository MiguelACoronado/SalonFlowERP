from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import ADMIN, requiere_roles
from app.schemas.auth import UsuarioActualizar, UsuarioCrear, UsuarioOut
from app.services import usuarios as servicio

router = APIRouter(prefix="/usuarios", tags=["Usuarios y roles"])
DB = Annotated[Session, Depends(get_db)]
Admin = Annotated[object, Depends(requiere_roles(ADMIN))]


@router.get("", response_model=list[UsuarioOut])
def listar(db: DB, _: Admin):
    return servicio.listar(db)


@router.post("", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
def crear(datos: UsuarioCrear, db: DB, _: Admin):
    return servicio.crear(db, datos)


@router.patch("/{usuario_id}", response_model=UsuarioOut)
def actualizar(usuario_id: int, datos: UsuarioActualizar, db: DB, actual: Admin):
    return servicio.actualizar(db, usuario_id, datos, actual)
