"""Clientes en riesgo de no volver (RF-14). Solo el administrador (propietario) los consulta.

El frontend llama a estos endpoints; solo la API habla con el servicio de IA.
"""
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import ADMIN, requiere_roles
from app.schemas.riesgo import ClientesEnRiesgoOut, ContactadoIn, ContactadoOut
from app.services import riesgo as servicio

router = APIRouter(prefix="/clientes-en-riesgo", tags=["Inteligencia artificial"])
DB = Annotated[Session, Depends(get_db)]
Admin = Annotated[object, Depends(requiere_roles(ADMIN))]
Predictor = Annotated[servicio.PredictorRiesgo, Depends(servicio.get_predictor)]


@router.get("", response_model=ClientesEnRiesgoOut,
            summary="Lista de clientes en riesgo (calcula una vez al día con el servicio de IA)")
def listar(db: DB, _: Admin, predictor: Predictor):
    return servicio.consultar(db, predictor)


@router.post("/recalcular", response_model=ClientesEnRiesgoOut,
             summary="Volver a calcular ahora con el servicio de IA (503 si no responde)")
def recalcular(db: DB, _: Admin, predictor: Predictor):
    return servicio.recalcular(db, predictor)


@router.patch("/{prediccion_id}/contactado", response_model=ContactadoOut,
              summary="Marcar o desmarcar a un cliente como contactado")
def contactado(prediccion_id: int, datos: ContactadoIn, db: DB, _: Admin):
    return servicio.marcar_contactado(db, prediccion_id, datos.contactado)
