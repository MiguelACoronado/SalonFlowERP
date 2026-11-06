"""Validadores compartidos."""
import re

from pydantic import BaseModel, ConfigDict

SOLO_LETRAS = re.compile(r"^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+$")


class Esquema(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)


def validar_nombre_persona(v: str) -> str:
    v = " ".join(v.split())
    if len(v) < 3:
        raise ValueError("El nombre debe tener al menos 3 caracteres.")
    if not SOLO_LETRAS.match(v):
        raise ValueError("El nombre solo puede tener letras y espacios.")
    return v


def normalizar_telefono(v: str) -> str:
    digitos = re.sub(r"\D", "", v)
    if len(digitos) == 10 and digitos.startswith("3"):
        return f"{digitos[:3]} {digitos[3:6]} {digitos[6:]}"
    if len(digitos) in (7, 10):
        return digitos
    raise ValueError("El teléfono debe tener 10 dígitos (celular) o 7 (fijo).")
