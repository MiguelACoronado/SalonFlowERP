"""Consultas de reportes: llaman a las funciones SQL definidas en 01_esquema.sql."""
from datetime import date

from sqlalchemy import text
from sqlalchemy.orm import Session


def _filas(db: Session, sql: str, **params) -> list[dict]:
    return [dict(r) for r in db.execute(text(sql), params).mappings()]


def comisiones(db: Session, desde: date, hasta: date) -> list[dict]:
    return _filas(db, "SELECT * FROM fn_comisiones(:d, :h)", d=desde, h=hasta)


def resumen(db: Session, desde: date, hasta: date) -> dict:
    return _filas(db, "SELECT * FROM fn_reporte_resumen(:d, :h)", d=desde, h=hasta)[0]


def servicios_populares(db: Session, desde: date, hasta: date) -> list[dict]:
    return _filas(db, "SELECT * FROM fn_servicios_populares(:d, :h)", d=desde, h=hasta)


def ocupacion(db: Session, desde: date, hasta: date) -> list[dict]:
    return _filas(db, "SELECT * FROM fn_ocupacion_semanal(:d, :h)", d=desde, h=hasta)


def ventas_del_dia(db: Session, dia: date) -> dict:
    return _filas(db, """
        SELECT count(*) AS servicios, coalesce(sum(precio), 0) AS ingresos
        FROM citas WHERE fecha = :d AND estado = 'Atendida'""", d=dia)[0]


def agenda_del_dia(db: Session, dia: date) -> dict:
    return _filas(db, """
        SELECT count(*) FILTER (WHERE estado <> 'Cancelada') AS activas,
               count(*) FILTER (WHERE estado = 'Pendiente')  AS pendientes,
               count(*) FILTER (WHERE estado = 'Confirmada') AS confirmadas,
               count(*) FILTER (WHERE estado = 'Atendida')   AS atendidas,
               count(*) FILTER (WHERE estado = 'Cancelada')  AS canceladas,
               coalesce(sum(precio) FILTER (WHERE estado <> 'Cancelada'), 0) AS valor_agendado
        FROM citas WHERE fecha = :d""", d=dia)[0]
