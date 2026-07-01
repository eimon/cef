from types import SimpleNamespace

import pytest

from services.waitlist_service import WaitlistService


@pytest.mark.asyncio
async def test_waitlist_priority_promoted_blocks_individual(monkeypatch):
    service = WaitlistService(db=SimpleNamespace())
    calls = {"individual": 0}

    async def fake_subscription_trigger(self, clase_template_id, fecha):
        return "promoted"

    async def fake_individual_trigger(clase_template_id, fecha):
        calls["individual"] += 1

    monkeypatch.setattr(
        "services.waitlist_suscripcion_service.WaitlistSuscripcionService.trigger_promotion_for_slot",
        fake_subscription_trigger,
    )
    monkeypatch.setattr(service, "_trigger_individual_promotion_for_slot", fake_individual_trigger)

    await service.trigger_promotion_for_slot(SimpleNamespace(), SimpleNamespace())

    assert calls["individual"] == 0


@pytest.mark.asyncio
async def test_waitlist_priority_blocked_blocks_individual(monkeypatch):
    service = WaitlistService(db=SimpleNamespace())
    calls = {"individual": 0}

    async def fake_subscription_trigger(self, clase_template_id, fecha):
        return "blocked"

    async def fake_individual_trigger(clase_template_id, fecha):
        calls["individual"] += 1

    monkeypatch.setattr(
        "services.waitlist_suscripcion_service.WaitlistSuscripcionService.trigger_promotion_for_slot",
        fake_subscription_trigger,
    )
    monkeypatch.setattr(service, "_trigger_individual_promotion_for_slot", fake_individual_trigger)

    await service.trigger_promotion_for_slot(SimpleNamespace(), SimpleNamespace())

    assert calls["individual"] == 0


@pytest.mark.asyncio
async def test_waitlist_priority_fallback_calls_individual(monkeypatch):
    service = WaitlistService(db=SimpleNamespace())
    calls = {"individual": 0}

    async def fake_subscription_trigger(self, clase_template_id, fecha):
        return "fallback"

    async def fake_individual_trigger(clase_template_id, fecha):
        calls["individual"] += 1

    monkeypatch.setattr(
        "services.waitlist_suscripcion_service.WaitlistSuscripcionService.trigger_promotion_for_slot",
        fake_subscription_trigger,
    )
    monkeypatch.setattr(service, "_trigger_individual_promotion_for_slot", fake_individual_trigger)

    await service.trigger_promotion_for_slot(SimpleNamespace(), SimpleNamespace())

    assert calls["individual"] == 1
