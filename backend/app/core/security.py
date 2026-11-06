"""Autenticación: hash de contraseñas (bcrypt), tokens JWT y control de acceso por rol."""
from datetime import datetime, timedelta, timezone
from typing import Annotated

import bcrypt
import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.core.errors import NoAutenticado, Prohibido

settings = get_settings()
_bearer = HTTPBearer(auto_error=False)

ADMIN, RECEPCION, ESTILISTA = "admin", "recepcion", "estilista"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=10)).decode()


def verificar_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except ValueError:
        return False


def crear_token(usuario) -> str:
    ahora = datetime.now(timezone.utc)
    payload = {
        "sub": str(usuario.id),
        "rol": usuario.rol,
        "estilista_id": usuario.estilista_id,
        "iat": ahora,
        "exp": ahora + timedelta(minutes=settings.jwt_minutos),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algoritmo)


def usuario_actual(
    cred: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    db: Annotated[Session, Depends(get_db)],
):
    from app.models.usuario import Usuario  # import local para evitar ciclos

    if cred is None:
        raise NoAutenticado("Debes iniciar sesión.")
    try:
        payload = jwt.decode(cred.credentials, settings.jwt_secret, algorithms=[settings.jwt_algoritmo])
    except jwt.ExpiredSignatureError:
        raise NoAutenticado("Tu sesión expiró. Inicia sesión de nuevo.")
    except jwt.PyJWTError:
        raise NoAutenticado("Token inválido.")
    usuario = db.get(Usuario, int(payload["sub"]))
    if usuario is None or not usuario.activo:
        raise NoAutenticado("El usuario no existe o está inactivo.")
    return usuario


def requiere_roles(*roles: str):
    """Dependencia que deja pasar solo a los roles indicados."""

    def _verificar(usuario=Depends(usuario_actual)):
        if usuario.rol not in roles:
            raise Prohibido("No tienes permiso para realizar esta acción.")
        return usuario

    return _verificar
