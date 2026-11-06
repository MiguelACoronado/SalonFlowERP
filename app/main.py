"""SalonFlow ERP · API REST.

Arquitectura por capas:
    routers/       → presentación (HTTP, validación de entrada, permisos por rol)
    services/      → aplicación (reglas de negocio)
    repositories/  → datos (consultas SQL / SQLAlchemy)

Si existe la interfaz compilada (frontend/dist), este mismo servidor la entrega:
así todo el sistema corre con un solo proceso y una sola dirección.
"""
import logging
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import get_settings
from app.core.database import engine
from app.core.errors import registrar_manejadores
from app.routers import auth, catalogo, citas, clientes, inventario, reportes, usuarios

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
settings = get_settings()
if settings.jwt_secret == "cambia-esta-clave-en-produccion" or len(settings.jwt_secret) < 32:
    logging.getLogger("salonflow").warning("JWT_SECRET es la clave por defecto o es muy corta: cámbiala en el archivo .env")

app = FastAPI(
    title="SalonFlow ERP API",
    description="API REST para la gestión de peluquerías y barberías de barrio.",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)
app.add_middleware(CORSMiddleware, allow_origins=settings.lista_cors, allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])
registrar_manejadores(app)

for r in (auth, usuarios, catalogo, clientes, citas, inventario, reportes):
    app.include_router(r.router, prefix="/api/v1")


@app.get("/api/health", tags=["Sistema"], summary="Estado de la API y de la base de datos")
def health():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"estado": "ok", "base_de_datos": "conectada"}


# ---------------------------------------------------------------------
# Interfaz web compilada (React). Se registra al final para no tapar la API.
# ---------------------------------------------------------------------
DIST = Path(os.environ.get("FRONTEND_DIST", Path(__file__).resolve().parents[2] / "frontend" / "dist")).resolve()

if (DIST / "index.html").is_file():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{ruta:path}", include_in_schema=False)
    def interfaz(ruta: str):
        if ruta.startswith("api/"):
            return JSONResponse(status_code=404, content={"detalle": "Ruta de la API no encontrada.", "errores": []})
        archivo = (DIST / ruta).resolve()
        if ruta and archivo.is_file() and DIST in archivo.parents:
            return FileResponse(archivo)
        return FileResponse(DIST / "index.html")  # rutas de React (/citas, /clientes…)
else:
    logging.getLogger("salonflow").info("No se encontró frontend/dist: solo se sirve la API.")
