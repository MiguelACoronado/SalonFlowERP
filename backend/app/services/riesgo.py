"""Clientes en riesgo de no volver (RF-14): integración con el servicio de IA.

Flujo (Tabla 8 del Documento Maestro):
    1. Se calcula una vez al día: la primera consulta del día dispara el cálculo
       (y el administrador puede pedir un recálculo).
    2. La vista v_indicadores_rfm entrega las 4 entradas de cada cliente con 2+ visitas.
    3. El adaptador PredictorHttp las envía a POST /predecir del servicio de IA, solo con
       un identificador interno (RN-06), con un tiempo máximo de espera de 10 s.
    4-5. El servicio responde la probabilidad, la etiqueta y la versión del modelo.
    6. Los resultados se guardan en prediccion_riesgo con la fecha del cálculo.
    7. El dashboard muestra la lista. Si el servicio no responde, se devuelve la última
       lista guardada con un aviso, y el resto del sistema sigue funcionando (RNF-05).
"""
import logging
from decimal import Decimal
from typing import Protocol

import httpx
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import ahora, hoy
from app.core.errors import NoEncontrado, ServicioNoDisponible
from app.repositories import riesgo as repo

log = logging.getLogger("salonflow.ia")


# ---------------------------------------------------------------------
# Puerto (interfaz) y adaptador hacia el servicio de IA
# ---------------------------------------------------------------------
class PredictorRiesgo(Protocol):
    """Interfaz IPredictorRiesgo del diagrama de clases: la lógica no depende de HTTP."""

    def predecir(self, clientes: list[dict]) -> dict: ...


class PredictorHttp:
    """Adaptador que llama al servicio FastAPI + TensorFlow de la carpeta ia/."""

    def __init__(self, url: str, api_key: str = "", timeout: float = 10):
        self.url = url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout

    def predecir(self, clientes: list[dict]) -> dict:
        headers = {"X-API-Key": self.api_key} if self.api_key else {}
        try:
            r = httpx.post(f"{self.url}/predecir", json={"clientes": clientes},
                           headers=headers, timeout=self.timeout)
            r.raise_for_status()
            return r.json()
        except httpx.TimeoutException:
            log.warning("El servicio de IA no respondió en %s s", self.timeout)
            raise ServicioNoDisponible("El servicio de IA no respondió a tiempo.")
        except (httpx.HTTPError, ValueError) as exc:
            log.warning("Error al llamar al servicio de IA: %s", exc)
            raise ServicioNoDisponible("El servicio de IA no está disponible.")


def get_predictor() -> PredictorRiesgo:
    s = get_settings()
    return PredictorHttp(s.ia_url, s.ia_api_key, s.ia_timeout_segundos)


# ---------------------------------------------------------------------
# Casos de uso
# ---------------------------------------------------------------------
def _a_numero(v):
    return float(v) if isinstance(v, Decimal) else v


def recalcular(db: Session, predictor: PredictorRiesgo) -> dict:
    """ConsultarClientesEnRiesgo: calcula entradas, llama al servicio y guarda el resultado del día."""
    entradas = repo.indicadores(db)
    dia = hoy()
    if entradas:
        # RN-06: solo números y un identificador interno; nunca nombre, teléfono ni correo.
        solicitud = [{"ref": e["cliente_id"],
                      "dias_desde_ultima": e["dias_desde_ultima"],
                      "intervalo_promedio": _a_numero(e["intervalo_promedio"]),
                      "num_visitas": e["num_visitas"],
                      "gasto_promedio": _a_numero(e["gasto_promedio"])} for e in entradas]
        respuesta = predictor.predecir(solicitud)
        try:
            version = str(respuesta["version_modelo"])
            por_ref = {int(r["ref"]): r for r in respuesta["resultados"]}
            filas = [{**e,
                      "probabilidad": Decimal(str(round(float(por_ref[e["cliente_id"]]["probabilidad_no_volver"]), 4))),
                      "en_riesgo": bool(por_ref[e["cliente_id"]]["en_riesgo"]),
                      "version_modelo": version} for e in entradas]
        except (KeyError, TypeError, ValueError):
            log.warning("Respuesta inválida del servicio de IA: %s", respuesta)
            raise ServicioNoDisponible("El servicio de IA devolvió una respuesta inválida.")
        repo.reemplazar_del_dia(db, dia, filas)
        db.commit()
        log.info("Clientes en riesgo recalculados: %s evaluados, modelo %s", len(filas), version)
    return consultar_guardado(db)


def consultar_guardado(db: Session, aviso: str | None = None) -> dict:
    """Última lista guardada, sin llamar al servicio."""
    fecha = repo.ultima_fecha(db)
    if fecha is None:
        return {"fecha_calculo": None, "actualizada": False, "version_modelo": None,
                "evaluados": 0, "en_riesgo": 0, "clientes": [], "aviso": aviso}
    return {"fecha_calculo": fecha, "actualizada": fecha == hoy(), **repo.resumen(db, fecha),
            "clientes": repo.lista(db, fecha), "aviso": aviso}


def consultar(db: Session, predictor: PredictorRiesgo) -> dict:
    """Lista para el dashboard. La primera consulta del día dispara el cálculo diario."""
    if repo.ultima_fecha(db) == hoy():
        return consultar_guardado(db)
    try:
        return recalcular(db, predictor)
    except ServicioNoDisponible as exc:
        db.rollback()
        fecha = repo.ultima_fecha(db)
        sufijo = f" Se muestra la última lista guardada ({fecha:%d/%m/%Y})." if fecha else ""
        return consultar_guardado(db, aviso=exc.detalle + sufijo)
    except IntegrityError:
        # Dos consultas calcularon al mismo tiempo: la otra ya guardó el resultado de hoy.
        db.rollback()
        return consultar_guardado(db)


def marcar_contactado(db: Session, prediccion_id: int, contactado: bool) -> dict:
    p = repo.obtener(db, prediccion_id)
    if p is None:
        raise NoEncontrado("La predicción no existe.")
    p.contactado = contactado
    p.contactado_en = ahora() if contactado else None
    db.commit()
    return {"id": p.id, "contactado": p.contactado, "contactado_en": p.contactado_en}


def contar_en_riesgo(db: Session) -> int | None:
    """Para el tablero: cuántos clientes están en riesgo según el último cálculo (sin llamar a la IA)."""
    fecha = repo.ultima_fecha(db)
    return repo.resumen(db, fecha)["en_riesgo"] if fecha else None
