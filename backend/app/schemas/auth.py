from typing import Literal

from pydantic import EmailStr, Field, field_validator

from app.schemas.comunes import Esquema, validar_nombre_persona

Rol = Literal["admin", "recepcion", "estilista"]


class LoginIn(Esquema):
    email: EmailStr
    password: str = Field(min_length=1)


class UsuarioOut(Esquema):
    id: int
    nombre: str
    email: str
    rol: Rol
    estilista_id: int | None
    activo: bool


class TokenOut(Esquema):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioOut


def _validar_password(v: str) -> str:
    if len(v) < 8 or not any(c.isdigit() for c in v) or not any(c.isalpha() for c in v):
        raise ValueError("La contraseña debe tener mínimo 8 caracteres, con letras y números.")
    return v


class UsuarioCrear(Esquema):
    nombre: str
    email: EmailStr
    password: str
    rol: Rol
    estilista_id: int | None = None

    _n = field_validator("nombre")(validar_nombre_persona)
    _p = field_validator("password")(_validar_password)


class UsuarioActualizar(Esquema):
    nombre: str | None = None
    rol: Rol | None = None
    estilista_id: int | None = None
    activo: bool | None = None
    password: str | None = None

    @field_validator("nombre")
    @classmethod
    def _n(cls, v):
        return validar_nombre_persona(v) if v is not None else v

    @field_validator("password")
    @classmethod
    def _p(cls, v):
        return _validar_password(v) if v is not None else v
