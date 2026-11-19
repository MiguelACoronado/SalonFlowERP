"""Pruebas del servicio de IA. Requieren el modelo entrenado (python entrenar_modelo.py).

Ejecutar desde la carpeta ia/:  pytest -v
"""
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import api  # noqa: E402

EJEMPLO = {"clientes": [
    {"ref": 1042, "dias_desde_ultima": 63, "intervalo_promedio": 21, "num_visitas": 9, "gasto_promedio": 38000},
    {"ref": 1077, "dias_desde_ultima": 12, "intervalo_promedio": 30, "num_visitas": 4, "gasto_promedio": 25000},
]}


@pytest.fixture(scope="module")
def cliente():
    with TestClient(api.app) as c:
        yield c


def test_estado(cliente):
    r = cliente.get("/")
    assert r.status_code == 200
    assert r.json()["modelo_cargado"] is True


def test_prediccion_ejemplo_documento(cliente):
    r = cliente.post("/predecir", json=EJEMPLO)
    assert r.status_code == 200
    datos = r.json()
    assert datos["version_modelo"] == "1.0.0"
    por_ref = {x["ref"]: x for x in datos["resultados"]}
    # 63 días sin venir con intervalo de 21 -> en riesgo; 12 días con intervalo de 30 -> no.
    assert por_ref[1042]["en_riesgo"] is True
    assert por_ref[1077]["en_riesgo"] is False
    assert all(0 <= x["probabilidad_no_volver"] <= 1 for x in datos["resultados"])


def test_respuesta_conserva_orden_y_refs(cliente):
    r = cliente.post("/predecir", json=EJEMPLO)
    assert [x["ref"] for x in r.json()["resultados"]] == [1042, 1077]


@pytest.mark.parametrize("campo, valor", [
    ("num_visitas", 1),           # con una visita no hay intervalo promedio
    ("intervalo_promedio", 0),
    ("dias_desde_ultima", -5),
])
def test_rechaza_valores_fuera_de_rango(cliente, campo, valor):
    malo = {"clientes": [dict(EJEMPLO["clientes"][0], **{campo: valor})]}
    assert cliente.post("/predecir", json=malo).status_code == 422


def test_rechaza_lista_vacia(cliente):
    assert cliente.post("/predecir", json={"clientes": []}).status_code == 422


def test_no_acepta_datos_personales(cliente):
    # RN-06: el contrato no tiene campos de nombre/teléfono; si llegan se ignoran y no se devuelven.
    con_nombre = {"clientes": [dict(EJEMPLO["clientes"][0], nombre="Ana", telefono="3001234567")]}
    r = cliente.post("/predecir", json=con_nombre)
    assert r.status_code == 200
    assert "nombre" not in r.text and "3001234567" not in r.text


def test_clave_obligatoria_si_esta_configurada(cliente, monkeypatch):
    monkeypatch.setattr(api, "API_KEY", "secreta")
    assert cliente.post("/predecir", json=EJEMPLO).status_code == 401
    assert cliente.post("/predecir", json=EJEMPLO, headers={"X-API-Key": "secreta"}).status_code == 200
