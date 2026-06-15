import pytest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from services.auth_service import AuthService
from services.email_service import EmailService


@pytest.fixture(autouse=True)
def mock_staff_credentials_email(monkeypatch):
    async def _send_staff_credentials(self, to_email, password, nombre=None):
        return None

    monkeypatch.setattr(
        EmailService,
        "send_staff_credentials",
        _send_staff_credentials,
    )


# ---------- Register ----------

async def test_register_success(client, admin_headers):
    resp = await client.post("/auth/register", json={
        "email": "nuevo@test.com",
        "telefono": "1122334455",
        "password": "secret123",
        "nombre": "Nuevo",
        "apellido": "Usuario",
        "role": "recepcion",
    }, headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "nuevo@test.com"
    assert "id" in data


async def test_register_staff_sends_credentials_email(client, admin_headers, monkeypatch):
    sent = {}

    async def _send_staff_credentials(self, to_email, password, nombre=None):
        sent["to_email"] = to_email
        sent["password"] = password
        sent["nombre"] = nombre

    monkeypatch.setattr(
        EmailService,
        "send_staff_credentials",
        _send_staff_credentials,
    )

    resp = await client.post("/auth/register", json={
        "email": "staff@test.com",
        "password": "secret123",
        "nombre": "Staff",
        "role": "recepcion",
    }, headers=admin_headers)

    assert resp.status_code == 200
    assert sent == {
        "to_email": "staff@test.com",
        "password": "secret123",
        "nombre": "Staff",
    }


async def test_register_duplicate_email(client, admin_headers):
    payload = {
        "email": "dup@test.com",
        "password": "secret123",
        "role": "recepcion",
    }
    resp1 = await client.post("/auth/register", json=payload, headers=admin_headers)
    assert resp1.status_code == 200

    resp2 = await client.post("/auth/register", json=payload, headers=admin_headers)
    assert resp2.status_code == 409


# ---------- Login ----------

async def test_login_success(client, admin_headers):
    await client.post("/auth/register", json={
        "email": "login@test.com",
        "password": "secret123",
        "role": "recepcion",
    }, headers=admin_headers)
    resp = await client.post("/auth/login", json={
        "email": "login@test.com",
        "password": "secret123",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


async def test_login_wrong_password(client, admin_headers):
    await client.post("/auth/register", json={
        "email": "wrongpw@test.com",
        "password": "correct",
        "role": "recepcion",
    }, headers=admin_headers)
    resp = await client.post("/auth/login", json={
        "email": "wrongpw@test.com",
        "password": "incorrect",
    })
    assert resp.status_code == 401


async def test_login_nonexistent_user(client):
    resp = await client.post("/auth/login", json={
        "email": "nobody@test.com",
        "password": "whatever",
    })
    assert resp.status_code == 401


# ---------- Password reset ----------

async def test_password_forgot_nonexistent_email(client):
    resp = await client.post("/auth/password/forgot", json={
        "email": "nobody@test.com",
    })
    assert resp.status_code == 400
    assert resp.json()["detail"] == "El email ingresado no se encuentra registrado"


def test_password_reset_token_expires_after_24_hours_even_with_future_expires_at():
    now = datetime.now(timezone.utc)
    token = SimpleNamespace(
        created_at=now - timedelta(hours=25),
        expires_at=now + timedelta(days=7),
    )

    assert AuthService.__new__(AuthService)._is_password_reset_token_expired(token) is True


# ---------- Perfil ----------

async def test_perfil_authenticated(client, admin_headers):
    resp = await client.get("/auth/perfil", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "admin@test.com"


async def test_perfil_no_token(client):
    resp = await client.get("/auth/perfil")
    assert resp.status_code == 401
