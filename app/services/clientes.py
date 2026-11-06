"""Reglas de negocio de clientes."""
from sqlalchemy.orm import Session

from app.core.errors import Conflicto, NoEncontrado, ReglaNegocio
from app.models import Servicio
from app.repositories import citas as repo_citas
from app.repositories import clientes as repo
from app.services.citas import a_dto


def _validar_servicio(db: Session, servicio_id: int | None):
    if servicio_id is not None and db.get(Servicio, servicio_id) is None:
        raise ReglaNegocio("Revisa los datos.", [{"campo": "servicio_frecuente_id", "mensaje": "El servicio no existe."}])


def listar(db: Session, texto: str | None) -> list[dict]:
    return repo.listar(db, texto)


def detalle(db: Session, cliente_id: int) -> dict:
    cliente = repo.detalle(db, cliente_id)
    if cliente is None:
        raise NoEncontrado("El cliente no existe.")
    return cliente


def crear(db: Session, datos) -> dict:
    if repo.existe_nombre(db, datos.nombre):
        raise Conflicto("Ya existe un cliente con ese nombre.", [{"campo": "nombre", "mensaje": "Nombre repetido."}])
    _validar_servicio(db, datos.servicio_frecuente_id)
    cliente = repo.crear(db, **datos.model_dump())
    db.commit()
    return repo.detalle(db, cliente.id)


def actualizar(db: Session, cliente_id: int, datos) -> dict:
    cliente = repo.obtener(db, cliente_id)
    if cliente is None:
        raise NoEncontrado("El cliente no existe.")
    cambios = datos.model_dump(exclude_unset=True)
    if "nombre" in cambios and repo.existe_nombre(db, cambios["nombre"], excluir_id=cliente_id):
        raise Conflicto("Ya existe un cliente con ese nombre.", [{"campo": "nombre", "mensaje": "Nombre repetido."}])
    _validar_servicio(db, cambios.get("servicio_frecuente_id"))
    for campo, valor in cambios.items():
        setattr(cliente, campo, valor)
    db.commit()
    return repo.detalle(db, cliente_id)


def historial(db: Session, cliente_id: int) -> list[dict]:
    detalle(db, cliente_id)  # valida que exista
    return [a_dto(c) for c in repo_citas.listar(db, cliente_id=cliente_id, limite=100)]
