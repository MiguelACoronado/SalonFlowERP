"""Acceso a datos de inventario."""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import MovimientoInventario, Producto


def listar(db: Session, solo_bajos: bool = False) -> list[Producto]:
    q = select(Producto).order_by(Producto.id)
    if solo_bajos:
        q = q.where(Producto.stock <= Producto.minimo)
    return list(db.scalars(q))


def obtener(db: Session, producto_id: int) -> Producto | None:
    return db.get(Producto, producto_id)


def existe_nombre(db: Session, nombre: str, excluir_id: int | None = None) -> bool:
    q = select(Producto.id).where(func.lower(Producto.nombre) == nombre.strip().lower())
    if excluir_id:
        q = q.where(Producto.id != excluir_id)
    return db.scalar(q) is not None


def crear(db: Session, **datos) -> Producto:
    p = Producto(**datos)
    db.add(p)
    db.flush()
    return p


def registrar_movimiento(db: Session, producto_id: int, cantidad: int, motivo: str) -> MovimientoInventario:
    """El trigger movimiento_aplicar actualiza el stock del producto."""
    mov = MovimientoInventario(producto_id=producto_id, cantidad=cantidad, motivo=motivo)
    db.add(mov)
    db.flush()
    db.refresh(mov)
    return mov


def movimientos(db: Session, producto_id: int, limite: int = 50) -> list[MovimientoInventario]:
    q = (select(MovimientoInventario).where(MovimientoInventario.producto_id == producto_id)
         .order_by(MovimientoInventario.fecha.desc(), MovimientoInventario.id.desc()).limit(limite))
    return list(db.scalars(q))
