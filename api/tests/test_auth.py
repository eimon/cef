import pytest


# ---------- Register ----------

async def test_register_success(client):
    resp = await client.post("/auth/register", json={
        "username": "newuser",
        "email": "new@test.com",
        "password": "secret123",
        "full_name": "New User",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["username"] == "newuser"
    assert data["email"] == "new@test.com"
    assert "id" in data


async def test_register_duplicate_email(client):
    payload = {
        "username": "user1",
        "email": "dup@test.com",
        "password": "secret123",
    }
    resp1 = await client.post("/auth/register", json=payload)
    assert resp1.status_code == 200

    payload["username"] = "user2"
    resp2 = await client.post("/auth/register", json=payload)
    assert resp2.status_code == 409


async def test_register_duplicate_username(client):
    payload = {
        "username": "sameuser",
        "email": "a@test.com",
        "password": "secret123",
    }
    resp1 = await client.post("/auth/register", json=payload)
    assert resp1.status_code == 200

    payload["email"] = "b@test.com"
    resp2 = await client.post("/auth/register", json=payload)
    assert resp2.status_code == 409


# ---------- Login ----------

async def test_login_success(client):
    await client.post("/auth/register", json={
        "username": "loginuser",
        "email": "login@test.com",
        "password": "secret123",
    })
    # OAuth2 form uses "username" field — the app looks up by username column
    resp = await client.post("/auth/login", data={
        "username": "loginuser",
        "password": "secret123",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


async def test_login_wrong_password(client):
    await client.post("/auth/register", json={
        "username": "wrongpw",
        "email": "wrongpw@test.com",
        "password": "correct",
    })
    resp = await client.post("/auth/login", data={
        "username": "wrongpw",
        "password": "incorrect",
    })
    assert resp.status_code == 401


async def test_login_nonexistent_user(client):
    resp = await client.post("/auth/login", data={
        "username": "nobody",
        "password": "whatever",
    })
    assert resp.status_code == 401


# ---------- Profile ----------

async def test_perfil_authenticated(client, admin_headers):
    resp = await client.get("/auth/perfil", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "admin@test.com"


async def test_perfil_no_token(client):
    resp = await client.get("/auth/perfil")
    assert resp.status_code == 401
