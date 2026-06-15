import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from repositories.asistencia_repository import AsistenciaRepository
from repositories.user_repository import UserRepository
from schemas.asistencia import (
    AsistenciaRecepcionResponse,
    AsistenciaEscaneoItem,
    EscaneoQRResponse,
    InstanciaHoyItem,
)
from exceptions.general import NotFoundException, BadRequestException


class AsistenciaService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = AsistenciaRepository(db)

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
