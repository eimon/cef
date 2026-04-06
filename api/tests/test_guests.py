import pytest


GUESTS_URL = "/guests/"


def _guest_payload(**overrides):
    payload = {
        "full_name": "Juan Pérez",
        "email": "juan@example.com",
        "phone": "+5491123456789",
        "document_type": "DU",
        "document_number": "12345678",
    }
    payload.update(overrides)
    return payload


# ---------- Create ----------

async def test_create_guest(client, admin_headers):
    resp = await client.post(GUESTS_URL, json=_guest_payload(), headers=admin_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["full_name"] == "Juan Pérez"
    assert data["document_number"] == "12345678"


async def test_create_guest_extranjero(client, admin_headers):
    resp = await client.post(
        GUESTS_URL,
        json=_guest_payload(
            full_name="John Doe",
            email="john@example.com",
            document_type="EXTRANJERO",
            document_number="AB123456",
        ),
        headers=admin_headers,
    )
    assert resp.status_code == 201
    assert resp.json()["document_number"] == "AB123456"


async def test_create_guest_du_invalid_non_numeric(client, admin_headers):
    """DU documents must contain only numbers."""
    resp = await client.post(
        GUESTS_URL,
        json=_guest_payload(document_number="ABC123"),
        headers=admin_headers,
    )
    assert resp.status_code == 422


async def test_create_guest_no_auth(client):
    resp = await client.post(GUESTS_URL, json=_guest_payload())
    assert resp.status_code == 401


async def test_create_guest_owner_forbidden(client, owner_headers):
    """Owner role cannot manage guests."""
    resp = await client.post(GUESTS_URL, json=_guest_payload(), headers=owner_headers)
    assert resp.status_code == 403


# ---------- List ----------

async def test_list_guests(client, admin_headers):
    await client.post(GUESTS_URL, json=_guest_payload(), headers=admin_headers)
    await client.post(
        GUESTS_URL,
        json=_guest_payload(
            full_name="María López",
            email="maria@example.com",
            document_number="87654321",
        ),
        headers=admin_headers,
    )

    resp = await client.get(GUESTS_URL, headers=admin_headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 2


# ---------- Get by ID ----------

async def test_get_guest(client, admin_headers):
    create_resp = await client.post(GUESTS_URL, json=_guest_payload(), headers=admin_headers)
    guest_id = create_resp.json()["id"]

    resp = await client.get(f"{GUESTS_URL}{guest_id}", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == guest_id


async def test_get_guest_not_found(client, admin_headers):
    fake_id = "00000000-0000-0000-0000-000000000000"
    resp = await client.get(f"{GUESTS_URL}{fake_id}", headers=admin_headers)
    assert resp.status_code == 404


# ---------- Update ----------

async def test_update_guest(client, admin_headers):
    create_resp = await client.post(GUESTS_URL, json=_guest_payload(), headers=admin_headers)
    guest_id = create_resp.json()["id"]

    resp = await client.put(f"{GUESTS_URL}{guest_id}", json={
        "full_name": "Juan Updated",
    }, headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["full_name"] == "Juan Updated"


# ---------- Delete ----------

async def test_delete_guest(client, admin_headers):
    create_resp = await client.post(GUESTS_URL, json=_guest_payload(), headers=admin_headers)
    guest_id = create_resp.json()["id"]

    resp = await client.delete(f"{GUESTS_URL}{guest_id}", headers=admin_headers)
    assert resp.status_code == 204
