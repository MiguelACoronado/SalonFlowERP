from datetime import datetime

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class CategoriaProducto(Base):
    __tablename__ = "categorias_producto"
    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(60))


class Producto(Base):
    __tablename__ = "productos"
    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100))
    categoria_id: Mapped[int] = mapped_column(ForeignKey("categorias_producto.id"))
    stock: Mapped[int] = mapped_column(default=0)
    minimo: Mapped[int] = mapped_column(default=0)

    categoria: Mapped[CategoriaProducto] = relationship(lazy="joined")

    @property
    def estado(self) -> str:
        return "Stock bajo" if self.stock <= self.minimo else "Disponible"


class MovimientoInventario(Base):
    __tablename__ = "movimientos_inventario"
    id: Mapped[int] = mapped_column(primary_key=True)
    producto_id: Mapped[int] = mapped_column(ForeignKey("productos.id"))
    cantidad: Mapped[int]
    motivo: Mapped[str] = mapped_column(String(20), default="Ajuste")
    fecha: Mapped[datetime] = mapped_column(server_default="now()")
