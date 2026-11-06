from decimal import Decimal

API = "/api/v1"


def test_comision_es_total_por_tasa(client, admin):
    datos = client.get(f"{API}/comisiones", headers=admin).json()
    assert datos["desde"] < datos["hasta"]  # el frontend muestra el rango consultado
    for f in datos["filas"]:
        assert Decimal(f["comision"]) == (Decimal(f["total"]) * Decimal(datos["tasa"]) / 100).quantize(Decimal("0.01"))


def test_cambiar_tasa_recalcula(client, admin):
    assert client.put(f"{API}/comisiones/tasa", json={"tasa": 25}, headers=admin).status_code == 200
    datos = client.get(f"{API}/comisiones", headers=admin).json()
    assert Decimal(datos["tasa"]) == 25
    assert client.put(f"{API}/comisiones/tasa", json={"tasa": 150}, headers=admin).status_code == 422


def test_estilista_solo_ve_su_comision(client, estilista):
    filas = client.get(f"{API}/comisiones", headers=estilista).json()["filas"]
    assert [f["estilista"] for f in filas] == ["Héctor Figueroa"]


def test_rango_de_fechas_invertido(client, admin):
    r = client.get(f"{API}/reportes/resumen?desde=2026-10-10&hasta=2026-10-01", headers=admin)
    assert r.status_code == 422


def test_reportes_basicos(client, admin):
    resumen = client.get(f"{API}/reportes/resumen", headers=admin).json()
    assert resumen["servicios_realizados"] > 0
    ocupacion = client.get(f"{API}/reportes/ocupacion", headers=admin).json()
    assert len(ocupacion) == 7


def test_dashboard_por_rol(client, admin, estilista):
    assert "clientes_total" in client.get(f"{API}/dashboard", headers=admin).json()
    assert "clientes_total" not in client.get(f"{API}/dashboard", headers=estilista).json()
