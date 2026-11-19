"""Servicio de predicción de clientes en riesgo de no volver (RF-14).

Lo consume únicamente la API de SalonFlow (backend); el frontend nunca lo llama
directamente. Recibe solo indicadores numéricos y un identificador interno por
cliente (RN-06, Ley 1581 de 2012) y no guarda las peticiones.

Ejecutar:
    uvicorn api:app --port 8001
Documentación interactiva:
    http://127.0.0.1:8001/docs
"""
import os
from contextlib import asynccontextmanager
from pathlib import Path

import numpy as np
import tensorflow as tf
from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from preprocesamiento import COLUMNAS, UMBRAL_RIESGO, VERSION_MODELO, normalizar

RUTA_MODELO = Path(os.getenv("MODELO_PATH", Path(__file__).resolve().parent / "modelo_riesgo.keras"))
# Si se define IA_API_KEY, el servicio exige el encabezado X-API-Key (solo la API de SalonFlow lo conoce).
API_KEY = os.getenv("IA_API_KEY", "")
NOTA = ("Resultado demostrativo de un modelo entrenado con datos sintéticos. "
        "Es una sugerencia para contactar al cliente; la decisión es del propietario.")

modelo: tf.keras.Model | None = None


@asynccontextmanager
async def ciclo_de_vida(_app: FastAPI):
    # El modelo se carga una sola vez al iniciar el servicio (Tabla 8, paso 4).
    global modelo
    if not RUTA_MODELO.is_file():
        raise RuntimeError(f"No se encontró {RUTA_MODELO}. Ejecuta primero: python entrenar_modelo.py")
    modelo = tf.keras.models.load_model(RUTA_MODELO)
    yield


app = FastAPI(
    title="SalonFlow IA · Clientes en riesgo",
    description="Red neuronal (TensorFlow/Keras) que estima la probabilidad de que un cliente no vuelva al salón.",
    version=VERSION_MODELO,
    lifespan=ciclo_de_vida,
)


def verificar_clave(x_api_key: str | None = Header(default=None)):
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Clave del servicio inválida o ausente.")


class ClienteEntrada(BaseModel):
    ref: int = Field(ge=1, description="Identificador interno del cliente (sin nombre, teléfono ni correo)")
    dias_desde_ultima: float = Field(ge=0, le=3650, description="Días desde la última visita (recencia)")
    intervalo_promedio: float = Field(gt=0, le=365, description="Días promedio entre visitas")
    num_visitas: int = Field(ge=2, le=10_000, description="Visitas registradas (mínimo 2)")
    gasto_promedio: float = Field(ge=0, le=10_000_000, description="Gasto promedio por visita en pesos")


class SolicitudPrediccion(BaseModel):
    clientes: list[ClienteEntrada] = Field(min_length=1, max_length=5000)


class ResultadoCliente(BaseModel):
    ref: int
    probabilidad_no_volver: float
    en_riesgo: bool


class RespuestaPrediccion(BaseModel):
    version_modelo: str
    umbral: float
    resultados: list[ResultadoCliente]
    nota: str


@app.get("/", summary="Estado del servicio")
def inicio():
    return {"mensaje": "Servicio inteligente activo", "version_modelo": VERSION_MODELO,
            "modelo_cargado": modelo is not None}


@app.post("/predecir", response_model=RespuestaPrediccion, dependencies=[Depends(verificar_clave)],
          summary="Probabilidad de que cada cliente no vuelva")
def predecir(solicitud: SolicitudPrediccion):
    filas = np.array([[getattr(c, col) for col in COLUMNAS] for c in solicitud.clientes], dtype=np.float32)
    probabilidades = modelo.predict(normalizar(filas), verbose=0).ravel()
    resultados = [
        ResultadoCliente(ref=c.ref, probabilidad_no_volver=round(float(p), 4), en_riesgo=bool(p >= UMBRAL_RIESGO))
        for c, p in zip(solicitud.clientes, probabilidades)
    ]
    return RespuestaPrediccion(version_modelo=VERSION_MODELO, umbral=UMBRAL_RIESGO, resultados=resultados, nota=NOTA)
