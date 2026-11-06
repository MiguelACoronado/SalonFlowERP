"""Reglas de negocio de inventario."""
from sqlalchemy.orm import Session

from app.core.errors import Conflicto, NoEncontrado, ReglaNegocio
from app.models import CategoriaProducto
from app.repositories import inventario as repo


def a_dto(p) -> dict:
    return {"id": p.id, "nombre": p.nombre, "categoria_id": p.categoria_id, "categoria": p.categoria.nombre,
            "stock": p.stock, "minimo": p.minimo, "estado": p.estado}


def _validar_categoria(db: Session, categoria_id: int | None):
    if categoria_id is not None and db.get(CategoriaProducto, categoria_id) is None:
        raise ReglaNegocio("Revisa los datos.", [{"campo": "categoria_id", "mensaje": "La categoría no existe."}])


def _obtener(db: Session, producto_id: int):
    p = repo.obtener(db, producto_id)
    if p is None:
        raise NoEncontrado("El producto no existe.")
    return p


def listar(db: Session, solo_bajos: bool) -> list[dict]:
    return [a_dto(p) for p in repo.listar(db, solo_bajos)]


def crear(db: Session, datos) -> dict:
    if repo.existe_nombre(db, datos.nombre):
        raise Conflicto("Ya existe un producto con ese nombre.", [{"campo": "nombre", "mensaje": "Nombre repetido."}])
    _validar_categoria(db, datos.categoria_id)
    p = repo.crear(db, **datos.model_dump())
    db.commit()
    db.refresh(p)
    return a_dto(p)


def actualizar(db: Session, producto_id: int, datos) -> dict:
    p = _obtener(db, producto_id)
    cambios = datos.model_dump(exclude_unset=True)
    if "nombre" in cambios and repo.existe_nombre(db, cambios["nombre"], excluir_id=producto_id):
        raise Conflicto("Ya existe un producto con ese nombre.", [{"campo": "nombre", "mensaje": "Nombre repetido."}])
    _validar_categoria(db, cambios.get("categoria_id"))
    for campo, valor in cambios.items():
        setattr(p, campo, valor)
    db.commit()
    db.refresh(p)
    return a_dto(p)


def registrar_movimiento(db: Session, producto_id: int, datos) -> dict:
    p = _obtener(db, producto_id)
    if p.stock + datos.cantidad < 0:
        raise ReglaNegocio(f"No hay suficiente stock: solo quedan {p.stock} unidades de {p.nombre}.",
                           [{"campo": "cantidad", "mensaje": f"Máximo puedes retirar {p.stock}."}])
    repo.registrar_movimiento(db, p.id, datos.cantidad, datos.motivo)
    db.commit()
    db.refresh(p)
    return a_dto(p)


def movimientos(db: Session, producto_id: int):
    _obtener(db, producto_id)
    return repo.movimientos(db, producto_id)
