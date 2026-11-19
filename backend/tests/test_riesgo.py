"""Integración con el servicio de IA (RF-14). El servicio se reemplaza por un predictor falso
inyectado con dependency_overrides, así las pruebas no dependen de TensorFlow ni de la red."""
import pytest

from app.core.errors import ServicioNoDisponible
from app.main import app
from app.services import riesgo as servicio

API = "/api/v1/clientes-en-riesgo"


class PredictorFalso:
    """Marca en riesgo con la regla fija y guarda lo que recibió para revisarlo."""

    def __init__(self):
        self.recibido: list[list[dict]] = []

    def predecir(self, clientes):
        self.recibido.append(clientes)
        return {"version_modelo": "prueba", "resultados": [
            {"ref": c["ref"],
             "probabilidad_no_volver": 0.9 if c["dias_desde_ultima"] > 2 * c["intervalo_promedio"] else 0.1,
             "en_riesgo": c["dias_desde_ultima"] > 2 * c["intervalo_promedio"]}
            for c in clientes]}


class PredictorCaido:
    def predecir(self, clientes):
        raise ServicioNoDisponible("El servicio de IA no respondió a tiempo.")


@pytest.fixture
def predictor():
    falso = PredictorFalso()
    app.dependency_overrides[servicio.get_predictor] = lambda: falso
    yield falso
    app.dependency_overrides.pop(servicio.get_predictor, None)


@pytest.fixture
def caido():
    app.dependency_overrides[servicio.get_predictor] = lambda: PredictorCaido()
    yield
    app.dependency_overrides.pop(servicio.get_predictor, None)


def test_lista_clientes_en_riesgo(client, admin, predictor):
    r = client.get(API, headers=admin)
    assert r.status_code == 200, r.text
    datos = r.json()
    assert datos["actualizada"] is True and datos["aviso"] is None
    assert datos["version_modelo"] == "prueba"
    assert datos["evaluados"] > 0 and datos["en_riesgo"] == len(datos["clientes"]) > 0
    # Ordenada por probabilidad y con los datos que muestra el dashboard.
    probs = [float(c["probabilidad"]) for c in datos["clientes"]]
    assert probs == sorted(probs, reverse=True)
    # Sofía Marín lleva 53 días sin venir: debe aparecer.
    assert "Sofía Marín" in [c["cliente"] for c in datos["clientes"]]


def test_solo_envia_numeros_y_un_identificador(client, admin, predictor):
    """RN-06 / Ley 1581: al servicio nunca le llegan nombres ni teléfonos."""
    client.get(API, headers=admin)
    enviados = predictor.recibido[0]
    assert enviados, "debe enviar al menos un cliente"
    for c in enviados:
        assert set(c) == {"ref", "dias_desde_ultima", "intervalo_promedio", "num_visitas", "gasto_promedio"}
        assert c["num_visitas"] >= 2 and c["intervalo_promedio"] > 0


def test_calcula_una_vez_al_dia(client, admin, predictor):
    client.get(API, headers=admin)
    client.get(API, headers=admin)
    assert len(predictor.recibido) == 1  # la segunda consulta usa lo guardado
    client.post(f"{API}/recalcular", headers=admin)
    assert len(predictor.recibido) == 2  # el recálculo manual sí vuelve a llamar


def test_indicadores_rfm_salen_de_las_citas_atendidas(client, admin, predictor):
    client.get(API, headers=admin)
    sofia = next(c for c in client.get(API, headers=admin).json()["clientes"] if c["cliente"] == "Sofía Marín")
    assert sofia["dias_desde_ultima"] == 53
    historial = client.get(f"/api/v1/clientes/{sofia['cliente_id']}/historial", headers=admin).json()
    assert sofia["num_visitas"] == sum(1 for c in historial if c["estado"] == "Atendida")


def test_servicio_caido_sin_lista_previa(client, admin, caido):
    r = client.get(API, headers=admin)
    assert r.status_code == 200  # el dashboard sigue funcionando (RNF-05)
    datos = r.json()
    assert datos["clientes"] == [] and "no respondió" in datos["aviso"]
    assert client.get("/api/v1/dashboard", headers=admin).status_code == 200


def test_servicio_caido_muestra_ultima_lista(client, admin, predictor):
    from sqlalchemy import text

    from app.core.database import SessionLocal

    client.get(API, headers=admin)  # se guarda la lista de hoy
    with SessionLocal() as db:       # simula que ese cálculo fue ayer
        db.execute(text("UPDATE prediccion_riesgo SET fecha_calculo = fecha_calculo - 1"))
        db.commit()
    app.dependency_overrides[servicio.get_predictor] = lambda: PredictorCaido()
    datos = client.get(API, headers=admin).json()
    assert datos["actualizada"] is False
    assert len(datos["clientes"]) > 0 and "última lista guardada" in datos["aviso"]
    assert client.post(f"{API}/recalcular", headers=admin).status_code == 503


def test_marcar_contactado_y_se_conserva_al_recalcular(client, admin, predictor):
    primero = client.get(API, headers=admin).json()["clientes"][0]
    r = client.patch(f"{API}/{primero['id']}/contactado", json={"contactado": True}, headers=admin)
    assert r.status_code == 200 and r.json()["contactado"] is True
    recalculado = client.post(f"{API}/recalcular", headers=admin).json()["clientes"]
    mismo = next(c for c in recalculado if c["cliente_id"] == primero["cliente_id"])
    assert mismo["contactado"] is True
    assert client.patch(f"{API}/999999/contactado", json={"contactado": True}, headers=admin).status_code == 404


def test_tablero_muestra_conteo_sin_llamar_a_la_ia(client, admin, predictor):
    assert client.get("/api/v1/dashboard", headers=admin).json()["clientes_en_riesgo"] is None
    n = client.get(API, headers=admin).json()["en_riesgo"]
    assert client.get("/api/v1/dashboard", headers=admin).json()["clientes_en_riesgo"] == n
    assert len(predictor.recibido) == 1


def test_solo_el_administrador(client, recepcion, estilista, predictor):
    assert client.get(API, headers=recepcion).status_code == 403
    assert client.get(API, headers=estilista).status_code == 403
    assert client.get(API).status_code == 401


def test_zona_horaria_se_conserva_en_conexiones_reusadas():
    """Los días sin venir dependen de CURRENT_DATE: debe ser la fecha de Colombia siempre."""
    from sqlalchemy import text

    from app.core.database import engine

    for _ in range(3):  # la conexión vuelve al pool (rollback) y se reutiliza
        with engine.connect() as conn:
            assert conn.execute(text("SELECT current_setting('TimeZone')")).scalar() == "America/Bogota"


def test_respuesta_invalida_del_servicio(client, admin):
    class Roto:
        def predecir(self, clientes):
            return {"resultados": "no es una lista"}

    app.dependency_overrides[servicio.get_predictor] = lambda: Roto()
    try:
        assert client.post(f"{API}/recalcular", headers=admin).status_code == 503
    finally:
        app.dependency_overrides.pop(servicio.get_predictor, None)
