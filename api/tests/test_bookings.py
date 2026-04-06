import pytest
from datetime import date


BOOKINGS_URL = "/bookings/"


def _booking_payload(property_id: str, check_in: date = None, check_out: date = None, **overrides):
    ci = check_in or date(2026, 6, 1)
    co = check_out or date(2026, 6, 5)
    payload = {
        "property_id": property_id,
        "check_in": ci.isoformat(),
        "check_out": co.isoformat(),
        "summary": "Test Booking",
    }
    payload.update(overrides)
    return payload


# ---------- Create ----------

async def test_create_booking(client, admin_headers, test_property):
    resp = await client.post(
        BOOKINGS_URL,
        json=_booking_payload(test_property["id"]),
        headers=admin_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["property_id"] == test_property["id"]
    assert data["check_in"] == "2026-06-01"
    assert data["check_out"] == "2026-06-05"
    assert data["ical_uid"]  # auto-generated


async def test_create_booking_invalid_dates(client, admin_headers, test_property):
    """check_out must be after check_in."""
    resp = await client.post(
        BOOKINGS_URL,
        json=_booking_payload(
            test_property["id"],
            check_in=date(2026, 6, 10),
            check_out=date(2026, 6, 5),
        ),
        headers=admin_headers,
    )
    assert resp.status_code == 400


async def test_create_booking_no_auth(client, test_property):
    resp = await client.post(
        BOOKINGS_URL,
        json=_booking_payload(test_property["id"]),
    )
    assert resp.status_code == 401


async def test_create_booking_owner_forbidden(client, owner_headers, test_property):
    """Owner role cannot create bookings."""
    resp = await client.post(
        BOOKINGS_URL,
        json=_booking_payload(test_property["id"]),
        headers=owner_headers,
    )
    assert resp.status_code == 403


# ---------- Overlap conflict ----------

async def test_create_booking_overlap_conflict(client, admin_headers, test_property):
    pid = test_property["id"]

    # First booking: June 1-5
    resp1 = await client.post(
        BOOKINGS_URL,
        json=_booking_payload(pid, date(2026, 6, 1), date(2026, 6, 5)),
        headers=admin_headers,
    )
    assert resp1.status_code == 201

    # Overlapping booking: June 3-7
    resp2 = await client.post(
        BOOKINGS_URL,
        json=_booking_payload(pid, date(2026, 6, 3), date(2026, 6, 7)),
        headers=admin_headers,
    )
    assert resp2.status_code == 409


# ---------- List ----------

async def test_list_bookings(client, admin_headers, test_property):
    pid = test_property["id"]
    await client.post(BOOKINGS_URL, json=_booking_payload(pid, date(2026, 7, 1), date(2026, 7, 3)), headers=admin_headers)
    await client.post(BOOKINGS_URL, json=_booking_payload(pid, date(2026, 8, 1), date(2026, 8, 3)), headers=admin_headers)

    resp = await client.get(BOOKINGS_URL, headers=admin_headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 2


async def test_list_bookings_by_property(client, admin_headers, test_property):
    pid = test_property["id"]
    await client.post(BOOKINGS_URL, json=_booking_payload(pid), headers=admin_headers)

    resp = await client.get(f"/bookings/properties/{pid}/bookings", headers=admin_headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


# ---------- Get by ID ----------

async def test_get_booking(client, admin_headers, test_property):
    create_resp = await client.post(
        BOOKINGS_URL,
        json=_booking_payload(test_property["id"]),
        headers=admin_headers,
    )
    booking_id = create_resp.json()["id"]

    resp = await client.get(f"{BOOKINGS_URL}{booking_id}", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == booking_id


# ---------- Update ----------

async def test_update_booking(client, admin_headers, test_property):
    create_resp = await client.post(
        BOOKINGS_URL,
        json=_booking_payload(test_property["id"]),
        headers=admin_headers,
    )
    booking_id = create_resp.json()["id"]

    resp = await client.put(f"{BOOKINGS_URL}{booking_id}", json={
        "summary": "Updated Summary",
    }, headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["summary"] == "Updated Summary"


# ---------- Delete (cancel) ----------

async def test_delete_booking(client, admin_headers, test_property):
    create_resp = await client.post(
        BOOKINGS_URL,
        json=_booking_payload(test_property["id"]),
        headers=admin_headers,
    )
    booking_id = create_resp.json()["id"]

    resp = await client.delete(f"{BOOKINGS_URL}{booking_id}", headers=admin_headers)
    assert resp.status_code == 204
