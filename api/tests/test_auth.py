import pytest


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


# ---------- Perfil ----------

async def test_perfil_authenticated(client, admin_headers):
    resp = await client.get("/auth/perfil", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "admin@test.com"


async def test_perfil_no_token(client):
    resp = await client.get("/auth/perfil")
    assert resp.status_code == 401
