"""Acceso a datos del servicio de IA: entradas RFM y predicciones guardadas."""
from datetime import date

from sqlalchemy import delete, text
from sqlalchemy.orm import Session

from app.models import PrediccionRiesgo


def indicadores(db: Session) -> list[dict]:
    """Entradas del modelo por cliente (vista v_indicadores_rfm). Sin datos personales."""
    sql = ("SELECT cliente_id, dias_desde_ultima, intervalo_promedio, num_visitas, gasto_promedio "
           "FROM v_indicadores_rfm ORDER BY cliente_id")
    return [dict(r) for r in db.execute(text(sql)).mappings()]


def reemplazar_del_dia(db: Session, fecha: date, filas: list[dict]) -> None:
    """Guarda el cálculo del día; si ya se había calculado hoy, lo reemplaza (conserva 'contactado')."""
    previos = {p.cliente_id: p for p in db.query(PrediccionRiesgo).filter_by(fecha_calculo=fecha)}
    db.execute(delete(PrediccionRiesgo).where(PrediccionRiesgo.fecha_calculo == fecha))
    for f in filas:
        anterior = previos.get(f["cliente_id"])
        db.add(PrediccionRiesgo(
            fecha_calculo=fecha,
            contactado=anterior.contactado if anterior else False,
            contactado_en=anterior.contactado_en if anterior else None,
            **f,
        ))
    db.flush()


def ultima_fecha(db: Session) -> date | None:
    return db.execute(text("SELECT max(fecha_calculo) FROM prediccion_riesgo")).scalar()


def lista(db: Session, fecha: date, solo_en_riesgo: bool = True) -> list[dict]:
    """Predicciones de una fecha con el nombre del cliente (el nombre nunca sale hacia el servicio de IA)."""
    sql = """
        SELECT p.id, p.cliente_id, c.nombre AS cliente, c.telefono,
               p.dias_desde_ultima, p.intervalo_promedio, p.num_visitas, p.gasto_promedio,
               p.probabilidad, p.en_riesgo, p.version_modelo, p.contactado, p.contactado_en,
               p.fecha_calculo
        FROM prediccion_riesgo p JOIN clientes c ON c.id = p.cliente_id AND c.autoriza_datos
        WHERE p.fecha_calculo = :f AND (:todos OR p.en_riesgo)
        ORDER BY p.probabilidad DESC, c.nombre"""
    return [dict(r) for r in db.execute(text(sql), {"f": fecha, "todos": not solo_en_riesgo}).mappings()]


def resumen(db: Session, fecha: date) -> dict:
    sql = """SELECT count(*) AS evaluados, count(*) FILTER (WHERE en_riesgo) AS en_riesgo,
                    max(version_modelo) AS version_modelo
             FROM prediccion_riesgo WHERE fecha_calculo = :f"""
    return dict(db.execute(text(sql), {"f": fecha}).mappings().one())


def borrar_de_cliente(db: Session, cliente_id: int) -> None:
    """Supresión de las predicciones de un cliente que revocó su autorización."""
    db.execute(delete(PrediccionRiesgo).where(PrediccionRiesgo.cliente_id == cliente_id))


def obtener(db: Session, prediccion_id: int) -> PrediccionRiesgo | None:
    return db.get(PrediccionRiesgo, prediccion_id)
