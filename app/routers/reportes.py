from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import ADMIN, requiere_roles, usuario_actual
from app.schemas.catalogo import TasaIn
from app.schemas.reportes import ComisionesOut, OcupacionDia, ResumenOut, ServicioPopular
from app.services import reportes as servicio

router = APIRouter(tags=["Comisiones y reportes"])
DB = Annotated[Session, Depends(get_db)]
Sesion = Annotated[object, Depends(usuario_actual)]
Admin = Annotated[object, Depends(requiere_roles(ADMIN))]


@router.get("/dashboard", summary="Indicadores de la pantalla de inicio")
def dashboard(db: DB, usuario: Sesion):
    return servicio.tablero(db, usuario)


@router.get("/comisiones", response_model=ComisionesOut, summary="Comisión = total atendido × tasa")
def comisiones(db: DB, usuario: Sesion, desde: date | None = None, hasta: date | None = None):
    return servicio.comisiones(db, desde, hasta, usuario)


@router.put("/comisiones/tasa", summary="Cambiar el porcentaje de comisión")
def cambiar_tasa(datos: TasaIn, db: DB, _: Admin):
    return servicio.cambiar_tasa(db, datos.tasa)


@router.get("/reportes/resumen", response_model=ResumenOut)
def resumen(db: DB, _: Admin, desde: date | None = None, hasta: date | None = None):
    return servicio.resumen(db, desde, hasta)


@router.get("/reportes/servicios-populares", response_model=list[ServicioPopular])
def populares(db: DB, _: Admin, desde: date | None = None, hasta: date | None = None):
    return servicio.servicios_populares(db, desde, hasta)


@router.get("/reportes/ocupacion", response_model=list[OcupacionDia])
def ocupacion(db: DB, _: Admin, desde: date | None = None, hasta: date | None = None):
    return servicio.ocupacion(db, desde, hasta)
