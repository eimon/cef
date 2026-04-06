import pytest


PROPS_URL = "/properties/"


# ---------- Create ----------

async def test_create_property_admin(client, admin_headers):
    resp = await client.post(PROPS_URL, json={
        "name": "Beach House",
        "address": "Av. Costanera 100",
        "base_price": "200.00",
        "avg_stay_days": 4,
    }, headers=admin_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Beach House"
    assert data["base_price"] == "200.00"


async def test_create_property_manager(client, manager_headers):
    resp = await client.post(PROPS_URL, json={
        "name": "City Apt",
        "address": "Calle Falsa 123",
    }, headers=manager_headers)
    assert resp.status_code == 201


async def test_create_property_owner(client, owner_headers):
    resp = await client.post(PROPS_URL, json={
        "name": "Owner Prop",
        "address": "Some Address",
    }, headers=owner_headers)
    assert resp.status_code == 201


async def test_create_property_no_auth(client):
    resp = await client.post(PROPS_URL, json={
        "name": "No Auth",
        "address": "Nowhere",
    })
    assert resp.status_code == 401


# ---------- List ----------

async def test_list_properties(client, admin_headers):
    await client.post(PROPS_URL, json={"name": "P1", "address": "A1"}, headers=admin_headers)
    await client.post(PROPS_URL, json={"name": "P2", "address": "A2"}, headers=admin_headers)

    resp = await client.get(PROPS_URL, headers=admin_headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 2


async def test_list_properties_pagination(client, admin_headers):
    for i in range(5):
        await client.post(PROPS_URL, json={"name": f"P{i}", "address": f"A{i}"}, headers=admin_headers)

    resp = await client.get(PROPS_URL, params={"skip": 0, "limit": 2}, headers=admin_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 2


# ---------- Get by ID ----------

async def test_get_property(client, admin_headers, test_property):
    prop_id = test_property["id"]
    resp = await client.get(f"{PROPS_URL}{prop_id}", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == prop_id


async def test_get_property_not_found(client, admin_headers):
    fake_id = "00000000-0000-0000-0000-000000000000"
    resp = await client.get(f"{PROPS_URL}{fake_id}", headers=admin_headers)
    assert resp.status_code == 404


# ---------- Update ----------

async def test_update_property(client, admin_headers, test_property):
    prop_id = test_property["id"]
    resp = await client.put(f"{PROPS_URL}{prop_id}", json={
        "name": "Updated Name",
    }, headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated Name"


# ---------- Delete (soft) ----------

async def test_delete_property(client, admin_headers, test_property):
    prop_id = test_property["id"]
    resp = await client.delete(f"{PROPS_URL}{prop_id}", headers=admin_headers)
    assert resp.status_code == 204
