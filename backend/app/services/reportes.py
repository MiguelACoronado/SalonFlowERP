"""Reportes, comisiones y tablero principal."""
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.database import hoy
from app.core.errors import ReglaNegocio
from app.core.security import ESTILISTA
from app.repositories import catalogo as repo_catalogo
from app.repositories import clientes as repo_clientes
from app.repositories import inventario as repo_inventario
from app.repositories import reportes as repo

DIAS_MAX_RANGO = 366


def rango(desde: date | None, hasta: date | None) -> tuple[date, date]:
    """Por defecto: los últimos 30 días incluyendo hoy."""
    hasta = hasta or hoy()
    desde = desde or hasta - timedelta(days=29)
    if desde > hasta:
        raise ReglaNegocio("La fecha inicial no puede ser mayor que la final.",
                           [{"campo": "desde", "mensaje": "Debe ser anterior a 'hasta'."}])
    if (hasta - desde).days > DIAS_MAX_RANGO:
        raise ReglaNegocio("El rango máximo de consulta es de un año.")
    return desde, hasta


def comisiones(db: Session, desde: date | None, hasta: date | None, usuario) -> dict:
    d, h = rango(desde, hasta)
    filas = repo.comisiones(db, d, h)
    if usuario.rol == ESTILISTA:   # el estilista solo ve su propia comisión
        filas = [f for f in filas if f["estilista"] == usuario.estilista.nombre]
    tasa = repo_catalogo.parametro(db, "tasa_comision")
    totales = {
        "estilista": "Total",
        "servicios": sum(f["servicios"] for f in filas),
        "total": sum((f["total"] for f in filas), Decimal(0)),
        "comision": sum((f["comision"] for f in filas), Decimal(0)),
    }
    return {"tasa": tasa, "filas": filas, "totales": totales, "desde": d, "hasta": h}


def cambiar_tasa(db: Session, tasa: Decimal) -> dict:
    repo_catalogo.guardar_parametro(db, "tasa_comision", tasa)
    db.commit()
    return {"tasa": tasa}


def resumen(db: Session, desde, hasta) -> dict:
    return repo.resumen(db, *rango(desde, hasta))


def servicios_populares(db: Session, desde, hasta) -> list[dict]:
    return repo.servicios_populares(db, *rango(desde, hasta))


def ocupacion(db: Session, desde, hasta) -> list[dict]:
    return repo.ocupacion(db, *rango(desde, hasta))


def tablero(db: Session, usuario) -> dict:
    """Indicadores de la pantalla de inicio."""
    dia = hoy()
    datos = {
        "fecha": dia,
        "agenda": repo.agenda_del_dia(db, dia),
        "ventas_hoy": repo.ventas_del_dia(db, dia),
    }
    if usuario.rol != ESTILISTA:
        dias_inactividad = int(repo_catalogo.parametro(db, "dias_inactividad"))
        datos["clientes_total"] = len(repo_clientes.listar(db))
        datos["clientes_inactivos"] = len(repo_clientes.inactivos(db, dias_inactividad))
        datos["productos_stock_bajo"] = len(repo_inventario.listar(db, solo_bajos=True))
        datos["mes"] = repo.resumen(db, dia - timedelta(days=29), dia)
    return datos
