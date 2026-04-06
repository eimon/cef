import pytest
from datetime import date


def _rules_url(property_id: str) -> str:
    return f"/properties/{property_id}/pricing-rules"


def _rule_payload(**overrides):
    payload = {
        "name": "Summer Rule",
        "start_date": "2026-06-01",
        "end_date": "2026-08-31",
        "profitability_percent": "80.00",
    }
    payload.update(overrides)
    return payload


# ---------- Create ----------

async def test_create_pricing_rule(client, admin_headers, test_property):
    pid = test_property["id"]
    resp = await client.post(
        _rules_url(pid),
        json=_rule_payload(),
        headers=admin_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Summer Rule"
    assert data["property_id"] == pid


async def test_create_pricing_rule_invalid_dates(client, admin_headers, test_property):
    """end_date must be after start_date."""
    resp = await client.post(
        _rules_url(test_property["id"]),
        json=_rule_payload(start_date="2026-09-01", end_date="2026-06-01"),
        headers=admin_headers,
    )
    assert resp.status_code in (400, 422)


async def test_create_pricing_rule_overlap(client, admin_headers, test_property):
    pid = test_property["id"]

    resp1 = await client.post(
        _rules_url(pid),
        json=_rule_payload(),
        headers=admin_headers,
    )
    assert resp1.status_code == 200

    # Overlapping range
    resp2 = await client.post(
        _rules_url(pid),
        json=_rule_payload(name="Another", start_date="2026-07-01", end_date="2026-09-30"),
        headers=admin_headers,
    )
    assert resp2.status_code == 400


# ---------- List ----------

async def test_list_pricing_rules(client, admin_headers, test_property):
    pid = test_property["id"]
    await client.post(_rules_url(pid), json=_rule_payload(), headers=admin_headers)

    resp = await client.get(_rules_url(pid), headers=admin_headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


# ---------- Update ----------

async def test_update_pricing_rule(client, admin_headers, test_property):
    pid = test_property["id"]
    create_resp = await client.post(_rules_url(pid), json=_rule_payload(), headers=admin_headers)
    rule_id = create_resp.json()["id"]

    resp = await client.put(
        f"/pricing-rules/{rule_id}",
        json={"name": "Updated Rule"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated Rule"


# ---------- Delete ----------

async def test_delete_pricing_rule(client, admin_headers, test_property):
    pid = test_property["id"]
    create_resp = await client.post(_rules_url(pid), json=_rule_payload(), headers=admin_headers)
    rule_id = create_resp.json()["id"]

    resp = await client.delete(f"/pricing-rules/{rule_id}", headers=admin_headers)
    assert resp.status_code == 200


# ---------- Calendar ----------

async def test_pricing_calendar(client, admin_headers, test_property):
    pid = test_property["id"]
    await client.post(_rules_url(pid), json=_rule_payload(), headers=admin_headers)

    resp = await client.get(
        f"/properties/{pid}/calendar",
        params={"start_date": "2026-06-01", "end_date": "2026-06-07"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 7  # 7 days


# ---------- Financial summary ----------

async def test_financial_summary(client, admin_headers, test_property):
    pid = test_property["id"]

    resp = await client.get(
        f"/properties/{pid}/financial-summary",
        params={"year": 2026, "month": 6},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "total_income" in data
    assert "costs" in data
    assert "net_profit" in data
