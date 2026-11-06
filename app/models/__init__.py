"""Modelos ORM. Las tablas las crea BaseDeDatos/01_esquema.sql (fuente de verdad)."""
from app.models.catalogo import Configuracion, Estilista, Servicio
from app.models.cita import ESTADOS, Cita
from app.models.cliente import Cliente
from app.models.inventario import CategoriaProducto, MovimientoInventario, Producto
from app.models.usuario import Usuario

__all__ = ["Configuracion", "Estilista", "Servicio", "Cita", "ESTADOS", "Cliente",
           "CategoriaProducto", "MovimientoInventario", "Producto", "Usuario"]
