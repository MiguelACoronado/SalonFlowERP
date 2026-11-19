"""Protección de datos personales (Ley 1581 de 2012): autorización, prueba, revocatoria y efecto en la IA."""
import pytest

from app.main import app
from app.services import riesgo as servicio_riesgo

API = "/api/v1"
NUEVO = {"nombre": "Ana María Ruiz", "telefono": "3001112233"}


def test_no_se_registra_sin_autorizacion(client, recepcion):
    # Art. 9: autorización previa. Sin el campo, o en False, no se crea el cliente.
    r = client.post(f"{API}/clientes", json=NUEVO, headers=recepcion)
    assert r.status_code == 422
    assert {e["campo"] for e in r.json()["errores"]} == {"autoriza_datos"}
    r = client.post(f"{API}/clientes", json={**NUEVO, "autoriza_datos": False}, headers=recepcion)
    assert r.status_code == 422
    assert "Ley 1581" in r.json()["errores"][0]["mensaje"]


def test_guarda_prueba_de_la_autorizacion(client, recepcion):
    # Art. 9 y art. 12 parágrafo: se conserva cuándo autorizó y qué versión del aviso aceptó.
    r = client.post(f"{API}/clientes", json={**NUEVO, "autoriza_datos": True}, headers=recepcion)
    assert r.status_code == 201
    c = r.json()
    assert c["autoriza_datos"] is True and c["fecha_autorizacion"] and c["version_politica"] == "1.0"


def test_aviso_de_privacidad(client, recepcion, estilista):
    r = client.get(f"{API}/clientes/aviso-privacidad", headers=recepcion)
    assert r.status_code == 200
    aviso = r.json()
    assert aviso["version"] == "1.0" and aviso["contacto"] and aviso["texto"]
    assert any("IA" in f for f in aviso["finalidades"])          # finalidad informada (art. 12, lit. a)
    assert "fuera de Colombia" in aviso["almacenamiento"]          # transferencia internacional (art. 26, lit. a)
    assert client.get(f"{API}/clientes/aviso-privacidad", headers=estilista).status_code == 403


class _Predictor:
    def __init__(self):
        self.refs: list[int] = []

    def predecir(self, clientes):
        self.refs = [c["ref"] for c in clientes]
        return {"version_modelo": "prueba",
                "resultados": [{"ref": c["ref"], "probabilidad_no_volver": 0.9, "en_riesgo": True} for c in clientes]}


@pytest.fixture
def predictor():
    p = _Predictor()
    app.dependency_overrides[servicio_riesgo.get_predictor] = lambda: p
    yield p
    app.dependency_overrides.pop(servicio_riesgo.get_predictor, None)


def test_revocar_saca_al_cliente_del_analisis_de_ia(client, admin, predictor):
    # Art. 8 lit. e: el cliente revoca la autorización.
    lista = client.get(f"{API}/clientes-en-riesgo", headers=admin).json()["clientes"]
    sofia = next(c for c in lista if c["cliente"] == "Sofía Marín")

    r = client.patch(f"{API}/clientes/{sofia['cliente_id']}", json={"autoriza_datos": False}, headers=admin)
    assert r.status_code == 200 and r.json()["autoriza_datos"] is False
    assert r.json()["fecha_autorizacion"]  # se conserva como prueba de la autorización que tuvo

    # Sus predicciones se borran de inmediato y no se vuelve a enviar al servicio de IA.
    assert sofia["cliente_id"] not in [c["cliente_id"] for c in client.get(f"{API}/clientes-en-riesgo", headers=admin).json()["clientes"]]
    client.post(f"{API}/clientes-en-riesgo/recalcular", headers=admin)
    assert predictor.refs and sofia["cliente_id"] not in predictor.refs


def test_volver_a_autorizar_renueva_la_prueba(client, admin):
    client.patch(f"{API}/clientes/5", json={"autoriza_datos": False}, headers=admin)
    antes = client.get(f"{API}/clientes/5", headers=admin).json()["fecha_autorizacion"]
    r = client.patch(f"{API}/clientes/5", json={"autoriza_datos": True}, headers=admin).json()
    assert r["autoriza_datos"] is True and r["fecha_autorizacion"] > antes


def test_editar_otros_datos_no_cambia_la_autorizacion(client, admin):
    antes = client.get(f"{API}/clientes/3", headers=admin).json()
    despues = client.patch(f"{API}/clientes/3", json={"telefono": "3159998877"}, headers=admin).json()
    assert despues["autoriza_datos"] is True
    assert despues["fecha_autorizacion"] == antes["fecha_autorizacion"]


def test_base_de_datos_exige_prueba_de_autorizacion():
    """Garantía final en la base de datos: no puede haber autorización sin fecha ni versión."""
    from sqlalchemy import text
    from sqlalchemy.exc import IntegrityError

    from app.core.database import SessionLocal

    with SessionLocal() as db, pytest.raises(IntegrityError):
        db.execute(text("INSERT INTO clientes (nombre, telefono, autoriza_datos) VALUES ('Prueba Sin Fecha', '3000000001', TRUE)"))
        db.flush()
