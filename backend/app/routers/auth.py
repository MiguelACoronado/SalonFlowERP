from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import usuario_actual
from app.schemas.auth import LoginIn, TokenOut, UsuarioOut
from app.services import usuarios as servicio

router = APIRouter(prefix="/auth", tags=["Autenticación"])
DB = Annotated[Session, Depends(get_db)]


@router.post("/login", response_model=TokenOut, summary="Iniciar sesión y obtener un token JWT")
def login(datos: LoginIn, db: DB):
    return servicio.login(db, datos.email, datos.password)


@router.get("/me", response_model=UsuarioOut, summary="Usuario de la sesión actual")
def yo(usuario=Depends(usuario_actual)):
    return usuario
