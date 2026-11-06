"""Autenticación y administración de usuarios (RF-01)."""
from sqlalchemy.orm import Session

from app.core.errors import Conflicto, NoAutenticado, NoEncontrado, ReglaNegocio
from app.core.security import ESTILISTA, crear_token, hash_password, verificar_password
from app.models import Estilista, Usuario
from app.repositories import usuarios as repo


def login(db: Session, email: str, password: str) -> dict:
    usuario = repo.por_email(db, email)
    # Mismo mensaje en ambos casos para no revelar qué correos existen.
    if usuario is None or not verificar_password(password, usuario.password_hash):
        raise NoAutenticado("Correo o contraseña incorrectos.")
    if not usuario.activo:
        raise NoAutenticado("Tu usuario está inactivo. Habla con el administrador.")
    return {"access_token": crear_token(usuario), "token_type": "bearer", "usuario": usuario}


def _validar_estilista(db: Session, rol: str, estilista_id: int | None, usuario_id: int | None = None):
    if rol == ESTILISTA:
        if estilista_id is None:
            raise ReglaNegocio("Revisa los datos.", [{"campo": "estilista_id",
                                                      "mensaje": "Un usuario estilista debe estar vinculado a un estilista."}])
        if db.get(Estilista, estilista_id) is None:
            raise ReglaNegocio("Revisa los datos.", [{"campo": "estilista_id", "mensaje": "El estilista no existe."}])
        otro = db.query(Usuario).filter(Usuario.estilista_id == estilista_id, Usuario.id != (usuario_id or 0)).first()
        if otro:
            raise Conflicto("Ese estilista ya tiene un usuario asignado.")


def listar(db: Session) -> list[Usuario]:
    return repo.listar(db)


def crear(db: Session, datos) -> Usuario:
    if repo.por_email(db, datos.email):
        raise Conflicto("Ya existe un usuario con ese correo.", [{"campo": "email", "mensaje": "Correo repetido."}])
    estilista_id = datos.estilista_id if datos.rol == ESTILISTA else None
    _validar_estilista(db, datos.rol, estilista_id)
    u = repo.crear(db, nombre=datos.nombre, email=datos.email.lower(), rol=datos.rol,
                   estilista_id=estilista_id, password_hash=hash_password(datos.password))
    db.commit()
    return u


def actualizar(db: Session, usuario_id: int, datos, actual: Usuario) -> Usuario:
    u = repo.obtener(db, usuario_id)
    if u is None:
        raise NoEncontrado("El usuario no existe.")
    cambios = datos.model_dump(exclude_unset=True)
    if u.id == actual.id and (cambios.get("activo") is False or cambios.get("rol", u.rol) != u.rol):
        raise ReglaNegocio("No puedes desactivarte ni quitarte el rol de administrador a ti mismo.")
    rol = cambios.get("rol", u.rol)
    estilista_id = cambios.get("estilista_id", u.estilista_id) if rol == ESTILISTA else None
    _validar_estilista(db, rol, estilista_id, u.id)
    if "password" in cambios:
        u.password_hash = hash_password(cambios.pop("password"))
    for campo in ("nombre", "rol", "activo"):
        if campo in cambios:
            setattr(u, campo, cambios[campo])
    u.estilista_id = estilista_id
    db.commit()
    return u
