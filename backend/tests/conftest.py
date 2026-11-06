"""Pruebas de integración: usan una base PostgreSQL real creada desde los scripts SQL del repositorio."""
import os
from pathlib import Path

import psycopg
import pytest

URL = os.environ.get("TEST_DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/salonflow_test")
os.environ["DATABASE_URL"] = URL
os.environ.setdefault("JWT_SECRET", "secreto-de-pruebas-con-longitud-suficiente-0123456789")

SQL = Path(__file__).resolve().parents[2] / "BaseDeDatos"


def _ejecutar(archivo: str):
    with psycopg.connect(URL, autocommit=True) as conn:
        conn.execute("SET TIME ZONE 'America/Bogota'")
        conn.execute((SQL / archivo).read_text(encoding="utf-8"))


@pytest.fixture(scope="session", autouse=True)
def base_de_datos():
    base, nombre = URL.rsplit("/", 1)
    with psycopg.connect(f"{base}/postgres", autocommit=True) as conn:
        conn.execute(f'DROP DATABASE IF EXISTS "{nombre}" WITH (FORCE)')
        conn.execute(f'CREATE DATABASE "{nombre}"')
    _ejecutar("01_esquema.sql")


@pytest.fixture(autouse=True)
def datos_limpios():
    """Cada prueba parte de los mismos datos de prueba."""
    _ejecutar("02_datos_prueba.sql")


@pytest.fixture(scope="session")
def client():
    from fastapi.testclient import TestClient

    from app.main import app
    return TestClient(app)


def _token(client, email, password):
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def admin(client):
    return _token(client, "admin@salonflow.co", "Admin123*")


@pytest.fixture
def recepcion(client):
    return _token(client, "recepcion@salonflow.co", "Recepcion123*")


@pytest.fixture
def estilista(client):  # Héctor Figueroa (estilista_id = 1)
    return _token(client, "hector@salonflow.co", "Estilista123*")
