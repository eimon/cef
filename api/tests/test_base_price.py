import pytest
from datetime import date, timedelta


def _modify_url(property_id: str) -> str:
    return f"/properties/{property_id}/base-price/modify"


def _history_url(property_id: str) -> str:
    return f"/properties/{property_id}/base-price/history"


def _revert_url(property_id: str) -> str:
    return f"/properties/{property_id}/base-price/revert"


# ---------- Initial state ----------

async def test_property_has_initial_base_price(client, admin_headers, test_property):
    """Creating a property with base_price > 0 creates a record in property_base_prices."""
    pid = test_property["id"]
    resp = await client.get(_history_url(pid), headers=admin_headers)
    assert resp.status_code == 200
    history = resp.json()
    assert len(history) == 1
    assert float(history[0]["value"]) == float(test_property["base_price"])
    assert history[0]["start_date"] is None
    assert history[0]["end_date"] is None
    assert history[0]["root_price_id"] is None


async def test_list_shows_current_base_price(client, admin_headers, test_property):
    """PropertyResponse.base_price reflects the cached current value."""
    pid = test_property["id"]
    resp = await client.get(f"/properties/{pid}", headers=admin_headers)
    assert resp.status_code == 200
    assert float(resp.json()["base_price"]) == float(test_property["base_price"])


# ---------- Modify ----------

async def test_modify_base_price_creates_new_version(client, admin_headers, test_property):
    """Modifying the base price creates a new version with the new value."""
    pid = test_property["id"]
    new_start = (date.today() + timedelta(days=10)).isoformat()
    resp = await client.post(
        _modify_url(pid),
        json={"value": "150.00", "start_date": new_start},
        headers=admin_headers,
    )
    assert resp.status_code == 201
    new_version = resp.json()
    assert float(new_version["value"]) == 150.00
    assert new_version["start_date"] == new_start
    assert new_version["end_date"] is None
    assert new_version["root_price_id"] is not None


async def test_modify_base_price_closes_previous_version(client, admin_headers, test_property):
    """After a modify, the old version's end_date is set to start_date - 1 day."""
    pid = test_property["id"]
    new_start = date.today() + timedelta(days=10)
    await client.post(
        _modify_url(pid),
        json={"value": "200.00", "start_date": new_start.isoformat()},
        headers=admin_headers,
    )

    history_resp = await client.get(_history_url(pid), headers=admin_headers)
    assert history_resp.status_code == 200
    versions = history_resp.json()
    assert len(versions) == 2

    original = next(v for v in versions if v["start_date"] is None)
    expected_end = (new_start - timedelta(days=1)).isoformat()
    assert original["end_date"] == expected_end


async def test_modify_base_price_updates_property_cache(client, admin_headers, test_property):
    """After a modify, PropertyResponse.base_price reflects the new value."""
    pid = test_property["id"]
    new_start = (date.today() + timedelta(days=5)).isoformat()
    await client.post(
        _modify_url(pid),
        json={"value": "250.00", "start_date": new_start},
        headers=admin_headers,
    )

    prop_resp = await client.get(f"/properties/{pid}", headers=admin_headers)
    assert float(prop_resp.json()["base_price"]) == 250.00


async def test_modify_base_price_invalid_date(client, admin_headers, test_property):
    """start_date must be after the current version's start_date."""
    pid = test_property["id"]
    first_start = date.today() + timedelta(days=20)
    mod_resp = await client.post(
        _modify_url(pid),
        json={"value": "120.00", "start_date": first_start.isoformat()},
        headers=admin_headers,
    )
    assert mod_resp.status_code == 201

    # Now try to modify with a date not after the current start
    invalid_start = (first_start - timedelta(days=1)).isoformat()
    resp = await client.post(
        _modify_url(pid),
        json={"value": "130.00", "start_date": invalid_start},
        headers=admin_headers,
    )
    assert resp.status_code == 400


async def test_modify_base_price_zero_value_rejected(client, admin_headers, test_property):
    """value must be > 0."""
    pid = test_property["id"]
    new_start = (date.today() + timedelta(days=10)).isoformat()
    resp = await client.post(
        _modify_url(pid),
        json={"value": "0.00", "start_date": new_start},
        headers=admin_headers,
    )
    assert resp.status_code == 422


# ---------- History ----------

async def test_get_base_price_history(client, admin_headers, test_property):
    """History is returned in chronological order."""
    pid = test_property["id"]

    start1 = (date.today() + timedelta(days=5)).isoformat()
    await client.post(
        _modify_url(pid),
        json={"value": "110.00", "start_date": start1},
        headers=admin_headers,
    )

    start2 = (date.today() + timedelta(days=15)).isoformat()
    await client.post(
        _modify_url(pid),
        json={"value": "120.00", "start_date": start2},
        headers=admin_headers,
    )

    resp = await client.get(_history_url(pid), headers=admin_headers)
    assert resp.status_code == 200
    versions = resp.json()
    assert len(versions) == 3
    assert versions[0]["start_date"] is None
    assert versions[1]["start_date"] == start1
    assert versions[2]["start_date"] == start2


# ---------- Revert ----------

async def test_revert_base_price(client, admin_headers, test_property):
    """Reverting restores the previous version."""
    pid = test_property["id"]
    original_value = float(test_property["base_price"])

    new_start = (date.today() + timedelta(days=10)).isoformat()
    await client.post(
        _modify_url(pid),
        json={"value": "999.00", "start_date": new_start},
        headers=admin_headers,
    )

    revert_resp = await client.post(_revert_url(pid), headers=admin_headers)
    assert revert_resp.status_code == 200
    restored = revert_resp.json()
    assert float(restored["value"]) == original_value
    assert restored["end_date"] is None

    # History should now have only 1 entry
    history_resp = await client.get(_history_url(pid), headers=admin_headers)
    assert len(history_resp.json()) == 1


async def test_revert_base_price_updates_property_cache(client, admin_headers, test_property):
    """After a revert, PropertyResponse.base_price reflects the restored value."""
    pid = test_property["id"]
    original_value = float(test_property["base_price"])

    new_start = (date.today() + timedelta(days=10)).isoformat()
    await client.post(
        _modify_url(pid),
        json={"value": "888.00", "start_date": new_start},
        headers=admin_headers,
    )

    await client.post(_revert_url(pid), headers=admin_headers)

    prop_resp = await client.get(f"/properties/{pid}", headers=admin_headers)
    assert float(prop_resp.json()["base_price"]) == original_value


async def test_revert_base_price_no_history_returns_400(client, admin_headers, test_property):
    """Reverting when there is no history returns 400."""
    pid = test_property["id"]
    resp = await client.post(_revert_url(pid), headers=admin_headers)
    assert resp.status_code == 400
