import pytest
from datetime import date, timedelta


def _costs_url(property_id: str) -> str:
    return f"/properties/{property_id}/costs"


def _cost_payload(**overrides):
    payload = {
        "name": "Cleaning Fee",
        "category": "PER_RESERVATION",
        "calculation_type": "FIXED_AMOUNT",
        "value": "50.00",
    }
    payload.update(overrides)
    return payload


# ---------- Create ----------

async def test_create_cost(client, admin_headers, test_property):
    pid = test_property["id"]
    resp = await client.post(
        _costs_url(pid),
        json=_cost_payload(),
        headers=admin_headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Cleaning Fee"
    assert data["property_id"] == pid


async def test_create_cost_percentage(client, admin_headers, test_property):
    pid = test_property["id"]
    resp = await client.post(
        _costs_url(pid),
        json=_cost_payload(
            name="Commission",
            category="PER_RESERVATION",
            calculation_type="PERCENTAGE",
            value="15.00",
        ),
        headers=admin_headers,
    )
    assert resp.status_code == 201


async def test_create_cost_percentage_over_100(client, admin_headers, test_property):
    """Percentage value cannot exceed 100."""
    pid = test_property["id"]
    resp = await client.post(
        _costs_url(pid),
        json=_cost_payload(
            calculation_type="PERCENTAGE",
            value="150.00",
        ),
        headers=admin_headers,
    )
    assert resp.status_code == 422


# ---------- List ----------

async def test_list_costs(client, admin_headers, test_property):
    pid = test_property["id"]
    await client.post(_costs_url(pid), json=_cost_payload(), headers=admin_headers)
    await client.post(_costs_url(pid), json=_cost_payload(name="Internet"), headers=admin_headers)

    resp = await client.get(_costs_url(pid), headers=admin_headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 2


# ---------- Update ----------

async def test_update_cost(client, admin_headers, test_property):
    pid = test_property["id"]
    create_resp = await client.post(_costs_url(pid), json=_cost_payload(), headers=admin_headers)
    cost_id = create_resp.json()["id"]

    resp = await client.put(
        f"/costs/{cost_id}",
        json={"name": "Updated Cost", "value": "75.00"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated Cost"


# ---------- Delete (soft) ----------

async def test_delete_cost(client, admin_headers, test_property):
    pid = test_property["id"]
    create_resp = await client.post(_costs_url(pid), json=_cost_payload(), headers=admin_headers)
    cost_id = create_resp.json()["id"]

    resp = await client.delete(f"/costs/{cost_id}", headers=admin_headers)
    assert resp.status_code == 204


# ---------- Temporal versioning ----------

async def test_create_cost_has_null_dates(client, admin_headers, test_property):
    """A newly created cost must have start_date and end_date as null."""
    pid = test_property["id"]
    resp = await client.post(_costs_url(pid), json=_cost_payload(), headers=admin_headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["start_date"] is None
    assert data["end_date"] is None
    assert data["root_cost_id"] is None


async def test_modify_cost_creates_new_version(client, admin_headers, test_property):
    """Modifying a cost creates a new version with the new value."""
    pid = test_property["id"]
    create_resp = await client.post(_costs_url(pid), json=_cost_payload(), headers=admin_headers)
    cost_id = create_resp.json()["id"]

    new_start = (date.today() + timedelta(days=10)).isoformat()
    resp = await client.post(
        f"/costs/{cost_id}/modify",
        json={"value": "80.00", "start_date": new_start},
        headers=admin_headers,
    )
    assert resp.status_code == 201
    new_version = resp.json()
    assert float(new_version["value"]) == 80.00
    assert new_version["start_date"] == new_start
    assert new_version["end_date"] is None
    assert new_version["root_cost_id"] == cost_id


async def test_modify_cost_closes_previous_version(client, admin_headers, test_property):
    """After a modify, the old version's end_date is set to start_date - 1 day."""
    pid = test_property["id"]
    create_resp = await client.post(_costs_url(pid), json=_cost_payload(), headers=admin_headers)
    original_id = create_resp.json()["id"]

    new_start = date.today() + timedelta(days=10)
    await client.post(
        f"/costs/{original_id}/modify",
        json={"value": "80.00", "start_date": new_start.isoformat()},
        headers=admin_headers,
    )

    # The history should show the original version with end_date = new_start - 1
    history_resp = await client.get(f"/costs/{original_id}/history", headers=admin_headers)
    assert history_resp.status_code == 200
    versions = history_resp.json()
    assert len(versions) == 2

    original = next(v for v in versions if v["id"] == original_id)
    expected_end = (new_start - timedelta(days=1)).isoformat()
    assert original["end_date"] == expected_end


async def test_modify_cost_invalid_date_before_current(client, admin_headers, test_property):
    """start_date must be after the current version's start_date."""
    pid = test_property["id"]
    first_start = date.today() + timedelta(days=20)
    create_resp = await client.post(_costs_url(pid), json=_cost_payload(), headers=admin_headers)
    cost_id = create_resp.json()["id"]

    # First modify to set a start_date
    await client.post(
        f"/costs/{cost_id}/modify",
        json={"value": "70.00", "start_date": first_start.isoformat()},
        headers=admin_headers,
    )

    # Now get the new version's id from the listing
    list_resp = await client.get(_costs_url(pid), headers=admin_headers)
    current_id = list_resp.json()[0]["id"]

    # Try to modify with a date that is not after the current start
    invalid_start = (first_start - timedelta(days=1)).isoformat()
    resp = await client.post(
        f"/costs/{current_id}/modify",
        json={"value": "60.00", "start_date": invalid_start},
        headers=admin_headers,
    )
    assert resp.status_code == 400


async def test_get_cost_history_ordered(client, admin_headers, test_property):
    """History is returned in chronological order."""
    pid = test_property["id"]
    create_resp = await client.post(_costs_url(pid), json=_cost_payload(), headers=admin_headers)
    cost_id = create_resp.json()["id"]

    start1 = (date.today() + timedelta(days=5)).isoformat()
    mod_resp = await client.post(
        f"/costs/{cost_id}/modify",
        json={"value": "60.00", "start_date": start1},
        headers=admin_headers,
    )
    new_id = mod_resp.json()["id"]

    start2 = (date.today() + timedelta(days=15)).isoformat()
    await client.post(
        f"/costs/{new_id}/modify",
        json={"value": "70.00", "start_date": start2},
        headers=admin_headers,
    )

    history_resp = await client.get(f"/costs/{cost_id}/history", headers=admin_headers)
    assert history_resp.status_code == 200
    versions = history_resp.json()
    assert len(versions) == 3
    # First version has no start_date (oldest)
    assert versions[0]["start_date"] is None
    assert versions[1]["start_date"] == start1
    assert versions[2]["start_date"] == start2


async def test_list_costs_shows_only_current_version(client, admin_headers, test_property):
    """After a modify, GET list returns only the new version."""
    pid = test_property["id"]
    create_resp = await client.post(_costs_url(pid), json=_cost_payload(), headers=admin_headers)
    cost_id = create_resp.json()["id"]

    new_start = (date.today() + timedelta(days=10)).isoformat()
    new_version = (
        await client.post(
            f"/costs/{cost_id}/modify",
            json={"value": "99.00", "start_date": new_start},
            headers=admin_headers,
        )
    ).json()

    list_resp = await client.get(_costs_url(pid), headers=admin_headers)
    ids_in_list = [c["id"] for c in list_resp.json()]
    assert new_version["id"] in ids_in_list
    assert cost_id not in ids_in_list


async def test_revert_cost(client, admin_headers, test_property):
    """Reverting a modified cost restores the previous version."""
    pid = test_property["id"]
    create_resp = await client.post(_costs_url(pid), json=_cost_payload(), headers=admin_headers)
    original_id = create_resp.json()["id"]

    new_start = (date.today() + timedelta(days=10)).isoformat()
    mod_resp = await client.post(
        f"/costs/{original_id}/modify",
        json={"value": "80.00", "start_date": new_start},
        headers=admin_headers,
    )
    new_id = mod_resp.json()["id"]

    revert_resp = await client.post(f"/costs/{new_id}/revert", headers=admin_headers)
    assert revert_resp.status_code == 200
    restored = revert_resp.json()
    assert restored["id"] == original_id
    assert restored["end_date"] is None

    # The listing should show the original again
    list_resp = await client.get(_costs_url(pid), headers=admin_headers)
    ids_in_list = [c["id"] for c in list_resp.json()]
    assert original_id in ids_in_list


async def test_revert_cost_no_history_returns_400(client, admin_headers, test_property):
    """Reverting a cost with no prior modifications returns 400."""
    pid = test_property["id"]
    create_resp = await client.post(_costs_url(pid), json=_cost_payload(), headers=admin_headers)
    cost_id = create_resp.json()["id"]

    resp = await client.post(f"/costs/{cost_id}/revert", headers=admin_headers)
    assert resp.status_code == 400
