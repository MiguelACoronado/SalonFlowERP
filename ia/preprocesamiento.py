"""Preparación de las entradas del modelo de clientes en riesgo (RF-14).

Se usa igual en el entrenamiento y en la API, para que el modelo siempre
reciba los datos normalizados de la misma forma.

Entradas (dimensiones RFM, sección 18.2 del Documento Maestro):
    1. dias_desde_ultima   -> recencia
    2. intervalo_promedio  -> frecuencia habitual (días entre visitas)
    3. num_visitas         -> frecuencia acumulada
    4. gasto_promedio      -> valor monetario (pesos colombianos)
"""
import numpy as np

VERSION_MODELO = "1.0.0"
UMBRAL_RIESGO = 0.5

# Valor con el que se divide cada entrada para dejarla entre 0 y 1.
# Los valores mayores se recortan a 1 (por ejemplo, un cliente con 500 días
# sin venir se trata igual que uno con 365).
MAXIMOS = {
    "dias_desde_ultima": 365.0,
    "intervalo_promedio": 180.0,
    "num_visitas": 100.0,
    "gasto_promedio": 500_000.0,
}
COLUMNAS = list(MAXIMOS)


def normalizar(filas: np.ndarray) -> np.ndarray:
    """Recibe una matriz (n, 4) con las columnas de COLUMNAS y la deja en [0, 1]."""
    filas = np.asarray(filas, dtype=np.float32)
    maximos = np.array([MAXIMOS[c] for c in COLUMNAS], dtype=np.float32)
    return np.clip(filas / maximos, 0.0, 1.0)


def regla_base(dias_desde_ultima: np.ndarray, intervalo_promedio: np.ndarray) -> np.ndarray:
    """Línea base de la Tabla 7: en riesgo si lleva más del doble de su intervalo sin venir."""
    return (np.asarray(dias_desde_ultima) > 2 * np.asarray(intervalo_promedio)).astype(np.int32)
