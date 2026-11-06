API = "/api/v1"


def test_login_correcto_devuelve_token_y_rol(client):
    r = client.post(f"{API}/auth/login", json={"email": "ADMIN@salonflow.co", "password": "Admin123*"})
    assert r.status_code == 200
    assert r.json()["usuario"]["rol"] == "admin"


def test_login_incorrecto_no_revela_si_existe_el_correo(client):
    r1 = client.post(f"{API}/auth/login", json={"email": "admin@salonflow.co", "password": "mala"})
    r2 = client.post(f"{API}/auth/login", json={"email": "nadie@salonflow.co", "password": "mala"})
    assert r1.status_code == r2.status_code == 401
    assert r1.json()["detalle"] == r2.json()["detalle"]


def test_sin_token_responde_401(client):
    assert client.get(f"{API}/clientes").status_code == 401


def test_token_invalido_responde_401(client):
    r = client.get(f"{API}/clientes", headers={"Authorization": "Bearer basura"})
    assert r.status_code == 401


def test_recepcion_no_administra_usuarios(client, recepcion):
    assert client.get(f"{API}/usuarios", headers=recepcion).status_code == 403


def test_estilista_no_ve_clientes(client, estilista):
    assert client.get(f"{API}/clientes", headers=estilista).status_code == 403


def test_crear_usuario_valida_password_y_email_repetido(client, admin):
    debil = {"nombre": "Nueva Persona", "email": "nueva@salonflow.co", "password": "123", "rol": "recepcion"}
    r = client.post(f"{API}/usuarios", json=debil, headers=admin)
    assert r.status_code == 422 and r.json()["errores"][0]["campo"] == "password"

    ok = {**debil, "password": "Segura123"}
    assert client.post(f"{API}/usuarios", json=ok, headers=admin).status_code == 201
    assert client.post(f"{API}/usuarios", json=ok, headers=admin).status_code == 409


def test_usuario_estilista_requiere_estilista(client, admin):
    datos = {"nombre": "Otro Estilista", "email": "otro@salonflow.co", "password": "Segura123", "rol": "estilista"}
    assert client.post(f"{API}/usuarios", json=datos, headers=admin).status_code == 422
    datos["estilista_id"] = 1  # ya tiene usuario (hector)
    assert client.post(f"{API}/usuarios", json=datos, headers=admin).status_code == 409


def test_admin_no_puede_desactivarse(client, admin):
    r = client.patch(f"{API}/usuarios/1", json={"activo": False}, headers=admin)
    assert r.status_code == 422


def test_usuario_inactivo_no_entra(client, admin):
    client.patch(f"{API}/usuarios/2", json={"activo": False}, headers=admin)
    r = client.post(f"{API}/auth/login", json={"email": "recepcion@salonflow.co", "password": "Recepcion123*"})
    assert r.status_code == 401
