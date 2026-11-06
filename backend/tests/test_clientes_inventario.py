API = "/api/v1"


def test_crear_cliente_normaliza_telefono(client, recepcion):
    r = client.post(f"{API}/clientes", json={"nombre": "  Ana   María Ruiz ", "telefono": "3001112233",
                                              "servicio_frecuente_id": 1}, headers=recepcion)
    assert r.status_code == 201
    assert r.json()["nombre"] == "Ana María Ruiz"
    assert r.json()["telefono"] == "300 111 2233"
    assert r.json()["ultima_visita"] is None


def test_cliente_repetido_sin_importar_mayusculas(client, recepcion):
    r = client.post(f"{API}/clientes", json={"nombre": "laura gómez", "telefono": "3000000000"}, headers=recepcion)
    assert r.status_code == 409


def test_cliente_datos_invalidos(client, recepcion):
    r = client.post(f"{API}/clientes", json={"nombre": "J4", "telefono": "12"}, headers=recepcion)
    assert r.status_code == 422
    assert {e["campo"] for e in r.json()["errores"]} == {"nombre", "telefono"}


def test_buscar_por_nombre_y_telefono(client, recepcion):
    assert [c["nombre"] for c in client.get(f"{API}/clientes?q=camila", headers=recepcion).json()] == ["Camila Torres"]
    assert [c["nombre"] for c in client.get(f"{API}/clientes?q=3154567890", headers=recepcion).json()] == ["Camila Torres"]


def test_ultima_visita_e_historial(client, recepcion):
    camila = client.get(f"{API}/clientes/3", headers=recepcion).json()
    assert camila["dias_sin_visita"] == 37
    historial = client.get(f"{API}/clientes/3/historial", headers=recepcion).json()
    assert historial and historial[0]["fecha"] >= historial[-1]["fecha"]


def test_salida_mayor_al_stock_se_rechaza(client, recepcion):
    r = client.post(f"{API}/productos/2/movimientos", json={"cantidad": -5, "motivo": "Consumo"}, headers=recepcion)
    assert r.status_code == 422
    assert "solo quedan 2" in r.json()["detalle"]


def test_compra_suma_stock_y_cambia_estado(client, recepcion):
    r = client.post(f"{API}/productos/2/movimientos", json={"cantidad": 10, "motivo": "Compra"}, headers=recepcion)
    assert r.status_code == 200
    assert r.json()["stock"] == 12 and r.json()["estado"] == "Disponible"
    movs = client.get(f"{API}/productos/2/movimientos", headers=recepcion).json()
    assert movs[0]["cantidad"] == 10


def test_movimiento_incoherente(client, recepcion):
    r = client.post(f"{API}/productos/1/movimientos", json={"cantidad": 3, "motivo": "Consumo"}, headers=recepcion)
    assert r.status_code == 422


def test_producto_nuevo_y_repetido(client, recepcion):
    datos = {"nombre": "Laca fijadora", "categoria_id": 1, "stock": 4, "minimo": 5}
    r = client.post(f"{API}/productos", json=datos, headers=recepcion)
    assert r.status_code == 201 and r.json()["estado"] == "Stock bajo"
    assert client.post(f"{API}/productos", json=datos, headers=recepcion).status_code == 409
    datos["nombre"], datos["stock"] = "Otro", -1
    assert client.post(f"{API}/productos", json=datos, headers=recepcion).status_code == 422
