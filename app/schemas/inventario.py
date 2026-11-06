from datetime import datetime
from typing import Literal

from pydantic import Field, model_validator

from app.schemas.comunes import Esquema


class ProductoCrear(Esquema):
    nombre: str = Field(min_length=3, max_length=100)
    categoria_id: int
    stock: int = Field(ge=0, le=100_000)
    minimo: int = Field(ge=0, le=100_000)


class ProductoActualizar(Esquema):
    nombre: str | None = Field(default=None, min_length=3, max_length=100)
    categoria_id: int | None = None
    minimo: int | None = Field(default=None, ge=0, le=100_000)


class ProductoOut(Esquema):
    id: int
    nombre: str
    categoria_id: int
    categoria: str
    stock: int
    minimo: int
    estado: str


class MovimientoCrear(Esquema):
    cantidad: int = Field(ge=-10_000, le=10_000)
    motivo: Literal["Ajuste", "Compra", "Consumo"] = "Ajuste"

    @model_validator(mode="after")
    def _coherente(self):
        if self.cantidad == 0:
            raise ValueError("La cantidad no puede ser 0.")
        if self.motivo == "Compra" and self.cantidad < 0:
            raise ValueError("Una compra debe sumar unidades (cantidad positiva).")
        if self.motivo == "Consumo" and self.cantidad > 0:
            raise ValueError("Un consumo debe restar unidades (cantidad negativa).")
        return self


class MovimientoOut(Esquema):
    id: int
    producto_id: int
    cantidad: int
    motivo: str
    fecha: datetime
