from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

API = "/api/v1"
HOY = datetime.now(ZoneInfo("America/Bogota")).date()
MANANA = (HOY + timedelta(days=1)).isoformat()


def cita(**cambios):
    return {"fecha": MANANA, "hora": "10:00", "cliente_id": 1, "servicio_id": 2, "estilista_id": 1, **cambios}


def test_agendar_cita_queda_pendiente_con_precio_del_servicio(client, recepcion):
    r = client.post(f"{API}/citas", json=cita(), headers=recepcion)
    assert r.status_code == 201, r.text
    assert r.json()["estado"] == "Pendiente"
    assert float(r.json()["precio"]) == 40000


def test_no_permite_citas_cruzadas(client, recepcion):
    client.post(f"{API}/citas", json=cita(), headers=recepcion)
    r = client.post(f"{API}/citas", json=cita(cliente_id=2), headers=recepcion)
    assert r.status_code == 409
    assert "ya tiene una cita" in r.json()["detalle"]


def test_otro_estilista_si_puede_a_la_misma_hora(client, recepcion):
    client.post(f"{API}/citas", json=cita(), headers=recepcion)
    assert client.post(f"{API}/citas", json=cita(estilista_id=2), headers=recepcion).status_code == 201


def test_cancelar_libera_el_horario(client, recepcion):
    c = client.post(f"{API}/citas", json=cita(), headers=recepcion).json()
    client.patch(f"{API}/citas/{c['id']}/estado", json={"estado": "Cancelada"}, headers=recepcion)
    assert client.post(f"{API}/citas", json=cita(cliente_id=3), headers=recepcion).status_code == 201


def test_validaciones_de_fecha_y_hora(client, recepcion):
    ayer = (HOY - timedelta(days=1)).isoformat()
    casos = [({"fecha": ayer}, "fecha"), ({"hora": "07:00"}, "hora"),
             ({"hora": "10:10"}, "hora"), ({"hora": "19:00"}, "hora")]
    for cambio, campo in casos:
        r = client.post(f"{API}/citas", json=cita(**cambio), headers=recepcion)
        assert r.status_code == 422, cambio
        assert any(e["campo"] == campo for e in r.json()["errores"]), cambio


def test_referencias_inexistentes(client, recepcion):
    r = client.post(f"{API}/citas", json=cita(cliente_id=999, servicio_id=999), headers=recepcion)
    assert r.status_code == 422
    campos = {e["campo"] for e in r.json()["errores"]}
    assert {"cliente_id", "servicio_id"} <= campos


def test_formato_invalido_da_mensaje_en_espanol(client, recepcion):
    r = client.post(f"{API}/citas", json=cita(hora="diez"), headers=recepcion)
    assert r.status_code == 422
    assert r.json()["errores"][0]["mensaje"].startswith("Hora inválida")


def test_flujo_de_estados(client, recepcion):
    c = client.post(f"{API}/citas", json=cita(), headers=recepcion).json()
    url = f"{API}/citas/{c['id']}/estado"
    assert client.patch(url, json={"estado": "Confirmada"}, headers=recepcion).status_code == 200
    # una cita futura no puede marcarse como atendida
    assert client.patch(url, json={"estado": "Atendida"}, headers=recepcion).status_code == 422
    assert client.patch(url, json={"estado": "Cancelada"}, headers=recepcion).status_code == 200
    # una cancelada ya no cambia
    assert client.patch(url, json={"estado": "Confirmada"}, headers=recepcion).status_code == 422


def test_estilista_solo_ve_y_atiende_sus_citas(client, estilista):
    citas = client.get(f"{API}/citas", headers=estilista).json()
    assert citas and all(c["estilista"] == "Héctor Figueroa" for c in citas)
    propia = citas[0]["id"]
    assert client.patch(f"{API}/citas/{propia}/estado", json={"estado": "Atendida"}, headers=estilista).status_code == 200
    assert client.patch(f"{API}/citas/{propia + 1}/estado", json={"estado": "Atendida"}, headers=estilista).status_code in (403, 422)


def test_estilista_no_puede_cancelar(client, estilista):
    propia = client.get(f"{API}/citas", headers=estilista).json()[0]["id"]
    r = client.patch(f"{API}/citas/{propia}/estado", json={"estado": "Cancelada"}, headers=estilista)
    assert r.status_code == 403


def test_estilista_no_puede_agendar(client, estilista):
    assert client.post(f"{API}/citas", json=cita(), headers=estilista).status_code == 403


def test_disponibilidad_excluye_horas_ocupadas(client, recepcion):
    client.post(f"{API}/citas", json=cita(hora="11:00"), headers=recepcion)
    r = client.get(f"{API}/citas/disponibilidad", params={"fecha": MANANA, "estilista_id": 1}, headers=recepcion)
    assert "11:00" not in r.json()["horas_libres"] and "12:00" in r.json()["horas_libres"]


def test_cita_inexistente_404(client, recepcion):
    r = client.patch(f"{API}/citas/999999/estado", json={"estado": "Confirmada"}, headers=recepcion)
    assert r.status_code == 404
