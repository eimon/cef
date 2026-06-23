import uuid
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.enums import DiaSemana, EstadoLicencia
from exceptions.general import BadRequestException, ConflictException, NotFoundException
from models.clase_instancia import ClaseInstancia
from models.clase_template import ClaseTemplate
from models.licencia import Licencia
from models.profesor import Profesor
from models.usuario import Usuario
from repositories.licencia_repository import LicenciaRepository
from repositories.profesor_repository import ProfesorRepository
from schemas.licencia import LicenciaCreate, LicenciaDecisionRequest, LicenciaUpdate


class LicenciaService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = LicenciaRepository(db)
        self.profesor_repo = ProfesorRepository(db)

    @staticmethod
    def _weekday_set(fecha_inicio: date, fecha_fin: date) -> set[DiaSemana]:
        weekdays: set[DiaSemana] = set()
        current = fecha_inicio
        mapping = {
            0: DiaSemana.LUNES,
            1: DiaSemana.MARTES,
            2: DiaSemana.MIERCOLES,
            3: DiaSemana.JUEVES,
            4: DiaSemana.VIERNES,
            5: DiaSemana.SABADO,
            6: DiaSemana.DOMINGO,
        }
        while current <= fecha_fin:
            weekdays.add(mapping[current.weekday()])
            current += timedelta(days=1)
        return weekdays

    @staticmethod
    def _validate_date_range(fecha_inicio: date, fecha_fin: date) -> None:
        if fecha_inicio > fecha_fin:
            raise BadRequestException("La fecha de inicio no puede ser mayor a la fecha de fin")

    async def _get_active_profesor(self, profesor_id: uuid.UUID, label: str = "Profesor") -> Profesor:
        profesor = await self.profesor_repo.get_by_id(profesor_id)
        if not profesor or not profesor.activo:
            raise NotFoundException(f"{label} no encontrado")
        return profesor

    async def _validate_reemplazo_disponible(
        self,
        titular_id: uuid.UUID,
        reemplazo_id: uuid.UUID | None,
        fecha_inicio: date,
        fecha_fin: date,
    ) -> None:
        if not reemplazo_id:
            return

        if titular_id == reemplazo_id:
            raise BadRequestException("El reemplazo no puede ser el mismo profesor")

        titular = await self._get_active_profesor(titular_id, "Profesor")
        reemplazo = await self._get_active_profesor(reemplazo_id, "Profesor reemplazo")

        titular_disciplinas = {d.nombre for d in titular.disciplinas}
        reemplazo_disciplinas = {d.nombre for d in reemplazo.disciplinas}
        if not titular_disciplinas.issubset(reemplazo_disciplinas):
            raise BadRequestException(
                "El profesor reemplazo no cubre todas las disciplinas del profesor titular"
            )

        weekdays = self._weekday_set(fecha_inicio, fecha_fin)
        result = await self.db.execute(
            select(ClaseTemplate)
            .where(
                ClaseTemplate.profesor_id == titular_id,
                ClaseTemplate.activo == True,
                ClaseTemplate.dia_semana.in_(tuple(weekdays)),
            )
        )
        titular_templates = list(result.scalars().all())

        for template in titular_templates:
            conflict_result = await self.db.execute(
                select(ClaseTemplate).where(
                    ClaseTemplate.profesor_id == reemplazo_id,
                    ClaseTemplate.activo == True,
                    ClaseTemplate.dia_semana == template.dia_semana,
                    ClaseTemplate.hora_inicio < template.hora_fin,
                    ClaseTemplate.hora_fin > template.hora_inicio,
                )
            )
            if conflict_result.scalars().first():
                raise ConflictException(
                    "El reemplazo propuesto tiene conflicto de horario con clases existentes"
                )

    async def _apply_reemplazo_to_instances(
        self,
        titular_id: uuid.UUID,
        reemplazo_id: uuid.UUID,
        fecha_inicio: date,
        fecha_fin: date,
    ) -> int:
        """Reassign class instances (not templates) for the license period to replacement professor."""
        result = await self.db.execute(
            select(ClaseInstancia).join(ClaseTemplate).where(
                ClaseInstancia.activo == True,
                ClaseInstancia.fecha >= fecha_inicio,
                ClaseInstancia.fecha <= fecha_fin,
                ClaseTemplate.profesor_id == titular_id,
                ClaseTemplate.activo == True,
            )
        )
        instances = list(result.scalars().all())
        for instance in instances:
            instance.profesor_id = reemplazo_id
        if instances:
            await self.db.flush()
        return len(instances)

    async def _revert_reemplazo_from_instances(
        self,
        titular_id: uuid.UUID,
        licencia_id: uuid.UUID,
    ) -> int:
        """Revert class instance professor overrides when license is rejected."""
        licencia = await self.repo.get_by_id(licencia_id)
        if not licencia:
            return 0

        result = await self.db.execute(
            select(ClaseInstancia).join(ClaseTemplate).where(
                ClaseInstancia.activo == True,
                ClaseInstancia.fecha >= licencia.fecha_inicio,
                ClaseInstancia.fecha <= licencia.fecha_fin,
                ClaseInstancia.profesor_id == licencia.profesor_reemplazo_id,
                ClaseTemplate.profesor_id == titular_id,
                ClaseTemplate.activo == True,
            )
        )
        instances = list(result.scalars().all())
        for instance in instances:
            instance.profesor_id = None
        if instances:
            await self.db.flush()
        return len(instances)

    async def list(
        self,
        skip: int = 0,
        limit: int = 100,
        profesor_id: uuid.UUID | None = None,
        estado: EstadoLicencia | None = None,
        fecha_desde: date | None = None,
        fecha_hasta: date | None = None,
    ) -> list[Licencia]:
        return await self.repo.get_all(skip, limit, profesor_id, estado, fecha_desde, fecha_hasta)

    async def get(self, licencia_id: uuid.UUID) -> Licencia:
        licencia = await self.repo.get_by_id(licencia_id)
        if not licencia or not licencia.activo:
            raise NotFoundException("Licencia no encontrada")
        return licencia

    async def create(self, data: LicenciaCreate) -> Licencia:
        self._validate_date_range(data.fecha_inicio, data.fecha_fin)
        await self._get_active_profesor(data.profesor_id)

        overlapping = await self.repo.get_overlapping(data.profesor_id, data.fecha_inicio, data.fecha_fin)
        if overlapping:
            raise ConflictException("Ya existe una licencia en el rango indicado")

        await self._validate_reemplazo_disponible(
            data.profesor_id,
            data.profesor_reemplazo_id,
            data.fecha_inicio,
            data.fecha_fin,
        )

        licencia = Licencia(
            profesor_id=data.profesor_id,
            profesor_reemplazo_id=data.profesor_reemplazo_id,
            fecha_inicio=data.fecha_inicio,
            fecha_fin=data.fecha_fin,
            tipo=data.tipo,
            estado=EstadoLicencia.PENDIENTE,
            motivo=data.motivo,
        )
        return await self.repo.create(licencia)

    async def update(self, licencia_id: uuid.UUID, data: LicenciaUpdate) -> Licencia:
        licencia = await self.get(licencia_id)
        if licencia.estado != EstadoLicencia.PENDIENTE:
            raise BadRequestException("Solo se pueden editar licencias en estado pendiente")

        fecha_inicio = data.fecha_inicio or licencia.fecha_inicio
        fecha_fin = data.fecha_fin or licencia.fecha_fin
        profesor_id = licencia.profesor_id
        reemplazo_id = (
            data.profesor_reemplazo_id
            if "profesor_reemplazo_id" in data.model_fields_set
            else licencia.profesor_reemplazo_id
        )

        self._validate_date_range(fecha_inicio, fecha_fin)
        overlapping = await self.repo.get_overlapping(profesor_id, fecha_inicio, fecha_fin, exclude_id=licencia.id)
        if overlapping:
            raise ConflictException("Ya existe una licencia en el rango indicado")

        await self._validate_reemplazo_disponible(
            profesor_id,
            reemplazo_id,
            fecha_inicio,
            fecha_fin,
        )

        fields = data.model_dump(exclude_unset=True)
        return await self.repo.update_fields(licencia, fields)

    async def delete(self, licencia_id: uuid.UUID) -> None:
        licencia = await self.get(licencia_id)
        if licencia.estado == EstadoLicencia.APROBADA:
            raise BadRequestException("No se puede eliminar una licencia aprobada")
        await self.repo.soft_delete(licencia)

    async def approve(
        self,
        licencia_id: uuid.UUID,
        data: LicenciaDecisionRequest,
        current_user: Usuario,
    ) -> Licencia:
        licencia = await self.get(licencia_id)
        if licencia.estado != EstadoLicencia.PENDIENTE:
            raise BadRequestException("Solo se pueden aprobar licencias pendientes")

        reemplazo_id = (
            data.profesor_reemplazo_id
            if "profesor_reemplazo_id" in data.model_fields_set
            else licencia.profesor_reemplazo_id
        )

        await self._validate_reemplazo_disponible(
            licencia.profesor_id,
            reemplazo_id,
            licencia.fecha_inicio,
            licencia.fecha_fin,
        )

        notas_admin = data.notas_admin
        if reemplazo_id:
            reassigned_count = await self._apply_reemplazo_to_instances(
                licencia.profesor_id,
                reemplazo_id,
                licencia.fecha_inicio,
                licencia.fecha_fin,
            )
            extra_note = (
                f"Reasignación automática aplicada a {reassigned_count} instancia(s) de clase."
            )
            notas_admin = f"{notas_admin} {extra_note}".strip() if notas_admin else extra_note
        else:
            extra_note = "Sin reemplazo automático; requiere resolución manual de operación."
            notas_admin = f"{notas_admin} {extra_note}".strip() if notas_admin else extra_note

        return await self.repo.update_fields(
            licencia,
            {
                "estado": EstadoLicencia.APROBADA,
                "profesor_reemplazo_id": reemplazo_id,
                "notas_admin": notas_admin,
                "resuelto_por_id": current_user.id,
                "resuelto_at": datetime.now(UTC),
            },
        )

    async def reject(
        self,
        licencia_id: uuid.UUID,
        data: LicenciaDecisionRequest,
        current_user: Usuario,
    ) -> Licencia:
        licencia = await self.get(licencia_id)
        if licencia.estado != EstadoLicencia.PENDIENTE:
            raise BadRequestException("Solo se pueden rechazar licencias pendientes")

        # Revert any reassignments if this was previously approved (shouldn't happen but defensive)
        if licencia.profesor_reemplazo_id:
            await self._revert_reemplazo_from_instances(
                licencia.profesor_id,
                licencia_id,
            )

        return await self.repo.update_fields(
            licencia,
            {
                "estado": EstadoLicencia.RECHAZADA,
                "notas_admin": data.notas_admin,
                "resuelto_por_id": current_user.id,
                "resuelto_at": datetime.now(UTC),
            },
        )
