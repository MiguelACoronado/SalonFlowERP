from decimal import Decimal

from pydantic import Field, field_validator

from app.schemas.comunes import Esquema


class EstilistaOut(Esquema):
    id: int
    nombre: str
    activo: bool


class ServicioOut(Esquema):
    id: int
    nombre: str
    precio: Decimal
    activo: bool


class ServicioCrear(Esquema):
    nombre: str = Field(min_length=3, max_length=100)
    precio: Decimal = Field(gt=0, le=10_000_000)


class ServicioActualizar(Esquema):
    nombre: str | None = Field(default=None, min_length=3, max_length=100)
    precio: Decimal | None = Field(default=None, gt=0, le=10_000_000)
    activo: bool | None = None


class CategoriaOut(Esquema):
    id: int
    nombre: str


class TasaIn(Esquema):
    tasa: Decimal = Field(gt=0, le=100)

    @field_validator("tasa")
    @classmethod
    def _decimales(cls, v: Decimal) -> Decimal:
        if v.as_tuple().exponent < -2:
            raise ValueError("Máximo dos decimales.")
        return v
