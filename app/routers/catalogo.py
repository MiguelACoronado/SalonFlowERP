from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.errors import Conflicto, NoEncontrado
from app.core.security import ADMIN, requiere_roles, usuario_actual
from app.models import Servicio
from app.repositories import catalogo as repo
from app.schemas.catalogo import CategoriaOut, EstilistaOut, ServicioActualizar, ServicioCrear, ServicioOut

router = APIRouter(tags=["Catálogos"])
DB = Annotated[Session, Depends(get_db)]
Sesion = Annotated[object, Depends(usuario_actual)]
Admin = Annotated[object, Depends(requiere_roles(ADMIN))]


@router.get("/estilistas", response_model=list[EstilistaOut])
def estilistas(db: DB, _: Sesion):
    return repo.estilistas(db)


@router.get("/servicios", response_model=list[ServicioOut])
def servicios(db: DB, _: Sesion, incluir_inactivos: bool = False):
    return repo.servicios(db, solo_activos=not incluir_inactivos)


@router.post("/servicios", response_model=ServicioOut, status_code=status.HTTP_201_CREATED)
def crear_servicio(datos: ServicioCrear, db: DB, _: Admin):
    if repo.servicio_por_nombre(db, datos.nombre):
        raise Conflicto("Ya existe un servicio con ese nombre.")
    s = Servicio(nombre=datos.nombre, precio=datos.precio)
    db.add(s)
    db.commit()
    return s


@router.patch("/servicios/{servicio_id}", response_model=ServicioOut)
def actualizar_servicio(servicio_id: int, datos: ServicioActualizar, db: DB, _: Admin):
    s = db.get(Servicio, servicio_id)
    if s is None:
        raise NoEncontrado("El servicio no existe.")
    cambios = datos.model_dump(exclude_unset=True)
    otro = repo.servicio_por_nombre(db, cambios["nombre"]) if "nombre" in cambios else None
    if otro and otro.id != servicio_id:
        raise Conflicto("Ya existe un servicio con ese nombre.")
    for campo, valor in cambios.items():
        setattr(s, campo, valor)
    db.commit()
    return s


@router.get("/categorias", response_model=list[CategoriaOut])
def categorias(db: DB, _: Sesion):
    return repo.categorias(db)
