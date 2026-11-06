"""Acceso a datos de clientes. Las lecturas usan la vista v_clientes (última visita calculada)."""
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.models import Cliente

_COLUMNAS = ("SELECT v.id, v.nombre, v.telefono, c.servicio_frecuente_id, v.servicio_frecuente, "
             "v.ultima_visita, v.dias_sin_visita FROM v_clientes v JOIN clientes c ON c.id = v.id")


def listar(db: Session, texto: str | None = None) -> list[dict]:
    if texto:
        sql = (_COLUMNAS + " WHERE v.nombre ILIKE :q OR replace(v.telefono, ' ', '') LIKE :tel ORDER BY v.nombre")
        params = {"q": f"%{texto.strip()}%", "tel": f"%{texto.replace(' ', '')}%"}
    else:
        sql, params = _COLUMNAS + " ORDER BY v.nombre", {}
    return [dict(r) for r in db.execute(text(sql), params).mappings()]


def detalle(db: Session, cliente_id: int) -> dict | None:
    fila = db.execute(text(_COLUMNAS + " WHERE v.id = :id"), {"id": cliente_id}).mappings().first()
    return dict(fila) if fila else None


def obtener(db: Session, cliente_id: int) -> Cliente | None:
    return db.get(Cliente, cliente_id)


def existe_nombre(db: Session, nombre: str, excluir_id: int | None = None) -> bool:
    q = select(Cliente.id).where(func.lower(func.trim(Cliente.nombre)) == nombre.strip().lower())
    if excluir_id:
        q = q.where(Cliente.id != excluir_id)
    return db.scalar(q) is not None


def inactivos(db: Session, dias: int) -> list[dict]:
    sql = _COLUMNAS + " WHERE v.dias_sin_visita > :d ORDER BY v.dias_sin_visita DESC"
    return [dict(r) for r in db.execute(text(sql), {"d": dias}).mappings()]


def crear(db: Session, **datos) -> Cliente:
    cliente = Cliente(**datos)
    db.add(cliente)
    db.flush()
    return cliente
