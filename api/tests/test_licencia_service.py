import uuid
from datetime import date
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from core.enums import EstadoLicencia, TipoLicencia
from exceptions.general import BadRequestException, ConflictException
from models.licencia import Licencia
from services.licencia_service import LicenciaService


@pytest.mark.asyncio
async def test_create_raises_bad_request_when_date_range_invalid():
    service = LicenciaService(AsyncMock())
    service.profesor_repo = AsyncMock()
    service.repo = AsyncMock()

    data = SimpleNamespace(
        profesor_id=uuid.uuid4(),
        fecha_inicio=date(2026, 7, 10),
        fecha_fin=date(2026, 7, 9),
        tipo=TipoLicencia.VACACIONES,
        motivo="Viaje",
        profesor_reemplazo_id=None,
    )

    with pytest.raises(BadRequestException, match="fecha de inicio"):
        await service.create(data)


@pytest.mark.asyncio
async def test_create_raises_conflict_when_overlapping_license_exists():
    service = LicenciaService(AsyncMock())
    service._get_active_profesor = AsyncMock(return_value=SimpleNamespace(activo=True))
    service._validate_reemplazo_disponible = AsyncMock(return_value=None)
    service.repo = AsyncMock()
    service.repo.get_overlapping = AsyncMock(return_value=object())

    data = SimpleNamespace(
        profesor_id=uuid.uuid4(),
        fecha_inicio=date(2026, 7, 1),
        fecha_fin=date(2026, 7, 5),
        tipo=TipoLicencia.ENFERMEDAD,
        motivo="Reposo",
        profesor_reemplazo_id=None,
    )

    with pytest.raises(ConflictException, match="Ya existe una licencia"):
        await service.create(data)


@pytest.mark.asyncio
async def test_approve_pending_without_replacement_adds_operational_note():
    service = LicenciaService(AsyncMock())
    licencia = Licencia(
        id=uuid.uuid4(),
        profesor_id=uuid.uuid4(),
        fecha_inicio=date(2026, 8, 1),
        fecha_fin=date(2026, 8, 3),
        tipo=TipoLicencia.PERSONAL,
        estado=EstadoLicencia.PENDIENTE,
    )

    captured_fields = {}

    async def _capture_update_fields(_licencia, fields):
        captured_fields.update(fields)
        return _licencia

    service.get = AsyncMock(return_value=licencia)
    service._validate_reemplazo_disponible = AsyncMock(return_value=None)
    service.repo = AsyncMock()
    service.repo.update_fields = AsyncMock(side_effect=_capture_update_fields)

    data = SimpleNamespace(notas_admin=None, profesor_reemplazo_id=None, model_fields_set=set())
    current_user = SimpleNamespace(id=uuid.uuid4())

    await service.approve(licencia.id, data, current_user)

    assert captured_fields["estado"] == EstadoLicencia.APROBADA
    assert "resolución manual" in captured_fields["notas_admin"]


@pytest.mark.asyncio
async def test_approve_pending_with_replacement_calls_reassignment():
    service = LicenciaService(AsyncMock())
    licencia = Licencia(
        id=uuid.uuid4(),
        profesor_id=uuid.uuid4(),
        fecha_inicio=date(2026, 9, 1),
        fecha_fin=date(2026, 9, 7),
        tipo=TipoLicencia.OTRO,
        estado=EstadoLicencia.PENDIENTE,
    )

    replacement_id = uuid.uuid4()
    captured_fields = {}

    async def _capture_update_fields(_licencia, fields):
        captured_fields.update(fields)
        return _licencia

    service.get = AsyncMock(return_value=licencia)
    service._validate_reemplazo_disponible = AsyncMock(return_value=None)
    service._apply_reemplazo_to_instances = AsyncMock(return_value=3)
    service.repo = AsyncMock()
    service.repo.update_fields = AsyncMock(side_effect=_capture_update_fields)

    data = SimpleNamespace(
        notas_admin="Aprobación operativa",
        profesor_reemplazo_id=replacement_id,
        model_fields_set={"profesor_reemplazo_id"},
    )
    current_user = SimpleNamespace(id=uuid.uuid4())

    await service.approve(licencia.id, data, current_user)

    service._apply_reemplazo_to_instances.assert_awaited_once()
    assert captured_fields["profesor_reemplazo_id"] == replacement_id
    assert "3 instancia(s)" in captured_fields["notas_admin"]


@pytest.mark.asyncio
async def test_reject_non_pending_license_raises_bad_request():
    service = LicenciaService(AsyncMock())
    licencia = Licencia(
        id=uuid.uuid4(),
        profesor_id=uuid.uuid4(),
        fecha_inicio=date(2026, 10, 1),
        fecha_fin=date(2026, 10, 2),
        tipo=TipoLicencia.VACACIONES,
        estado=EstadoLicencia.APROBADA,
    )

    service.get = AsyncMock(return_value=licencia)

    data = SimpleNamespace(notas_admin="", model_fields_set=set())
    current_user = SimpleNamespace(id=uuid.uuid4())

    with pytest.raises(BadRequestException, match="rechazar licencias pendientes"):
        await service.reject(licencia.id, data, current_user)
