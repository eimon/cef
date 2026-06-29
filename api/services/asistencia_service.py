import uuid
from datetime import date, datetime
from sqlalchemy.ext.asyncio import AsyncSession

from repositories.asistencia_repository import AsistenciaRepository
from repositories.clase_template_repository import ClaseTemplateRepository
from repositories.inscripcion_repository import InscripcionRepository
from repositories.user_repository import UserRepository
from schemas.asistencia import (
    AsistenciaRecepcionResponse,
    AsistenciaEscaneoItem,
    EscaneoQRResponse,
    InstanciaHoyItem,
)
from exceptions.general import NotFoundException, BadRequestException
from core.enums import DiaSemana

_WEEKDAY_TO_DIA: dict[int, DiaSemana] = {
    0: DiaSemana.LUNES,
    1: DiaSemana.MARTES,
    2: DiaSemana.MIERCOLES,
    3: DiaSemana.JUEVES,
    4: DiaSemana.VIERNES,
    5: DiaSemana.SABADO,
    6: DiaSemana.DOMINGO,
}


class AsistenciaService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = AsistenciaRepository(db)
        self.clase_template_repo = ClaseTemplateRepository(db)
        self.inscripcion_repo = InscripcionRepository(db)

    async def _ensure_instancias_hoy(self) -> None:
        today = date.today()
        dia_semana = _WEEKDAY_TO_DIA[today.weekday()]
        templates = await self.clase_template_repo.get_activos_by_dia(dia_semana)
        for template in templates:
            cupo_reservado = await self.inscripcion_repo.count_active_suscripciones(template.id, today)
            cupo_disponible = max(template.capacidad_maxima - cupo_reservado, 0)
            await self.inscripcion_repo.get_or_create_instancia(template.id, today, cupo_disponible)

    async def get_for_instancia(self, instancia_id: uuid.UUID) -> list[AsistenciaRecepcionResponse]:
        asistencias = await self.repo.get_by_instancia(instancia_id)
        return [
            AsistenciaRecepcionResponse(
                asistencia_id=a.id,
                usuario_nombre=f"{a.usuario.nombre or ''} {a.usuario.apellido or ''}".strip(),
                tipo=a.tipo,
                asistio=a.asistio,
                cancelo=a.cancelo,
            )
            for a in asistencias
        ]

    async def get_hoy_por_dni(self, dni: str) -> EscaneoQRResponse:
        usuario = await UserRepository(self.db).get_by_dni(dni)
        if not usuario:
            raise NotFoundException("No se encontró ningún cliente con el DNI ingresado")

        asistencias = await self.repo.get_hoy_por_usuario(usuario.id)
        nombre = f"{usuario.nombre or ''} {usuario.apellido or ''}".strip() or usuario.email

        if not asistencias:
            raise BadRequestException("El cliente no tiene inscripción activa en este horario")

        now = datetime.now().time()

        en_horario = [
            a for a in asistencias
            if a.clase_instancia.clase_template.hora_inicio <= now <= a.clase_instancia.clase_template.hora_fin
        ]

        if not en_horario:
            raise BadRequestException("No es posible registrar asistencia fuera del horario de la clase")

        sin_marcar = [a for a in en_horario if not a.asistio]

        if not sin_marcar:
            raise BadRequestException("La asistencia de este cliente ya fue registrada para este horario")

        items = [
            AsistenciaEscaneoItem(
                asistencia_id=a.id,
                clase_nombre=a.clase_instancia.clase_template.nombre,
                disciplina=a.clase_instancia.clase_template.disciplina,
                hora_inicio=str(a.clase_instancia.clase_template.hora_inicio)[:5],
                hora_fin=str(a.clase_instancia.clase_template.hora_fin)[:5],
                tipo=a.tipo,
                asistio=a.asistio,
                cancelo=a.cancelo,
                puede_marcar=True,
                razon_no_puede=None,
            )
            for a in sin_marcar
        ]

        return EscaneoQRResponse(usuario_nombre=nombre, asistencias=items)

    async def get_instancias_hoy(self) -> list[InstanciaHoyItem]:
        await self._ensure_instancias_hoy()
        instancias = await self.repo.get_instancias_hoy()
        return [
            InstanciaHoyItem(
                instancia_id=inst.id,
                clase_nombre=inst.clase_template.nombre,
                disciplina=inst.clase_template.disciplina,
                hora_inicio=str(inst.clase_template.hora_inicio)[:5],
                hora_fin=str(inst.clase_template.hora_fin)[:5],
                sala_nombre=inst.clase_template.sala.nombre if inst.clase_template.sala else "Sin sala",
            )
            for inst in instancias
        ]

    async def marcar_por_qr(self, instancia_id: uuid.UUID, dni: str) -> None:
        usuario = await UserRepository(self.db).get_by_dni(dni)
        if not usuario:
            raise BadRequestException("El cliente no se encuentra inscripto a la clase")

        asistencia = await self.repo.get_by_instancia_y_usuario(instancia_id, usuario.id)
        if not asistencia:
            raise BadRequestException("El cliente no se encuentra inscripto a la clase")

        if asistencia.asistio:
            raise BadRequestException("El cliente ya registró la asistencia")

        await self.repo.marcar_presente(asistencia.id)

    async def marcar_presente(self, asistencia_id: uuid.UUID) -> None:
        asistencia = await self.repo.get_by_id_with_relations(asistencia_id)
        if not asistencia:
            raise NotFoundException("Asistencia no encontrada")

        if asistencia.asistio:
            raise BadRequestException("La asistencia de este cliente ya fue registrada para este horario")

        now = datetime.now().time()
        ct = asistencia.clase_instancia.clase_template

        if not (ct.hora_inicio <= now <= ct.hora_fin):
            raise BadRequestException("No es posible registrar asistencia fuera del horario de la clase")

        await self.repo.marcar_presente(asistencia_id)
