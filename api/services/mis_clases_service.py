import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from repositories.mis_clases_repository import MisClasesRepository
from services.suscripcion_service import SuscripcionService
from schemas.mis_clases import (
    MiClaseIndividualResponse,
    MiSuscripcionResponse,
    InstanciaEnSuscripcionResponse,
)


class MisClasesService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = MisClasesRepository(db)

    async def get_individuales(self, usuario_id: uuid.UUID) -> list[MiClaseIndividualResponse]:
        rows = await self.repo.get_individuales(usuario_id)
        return [
            MiClaseIndividualResponse(
                asistencia_id=row.asistencia_id,
                clase_nombre=row.clase_nombre,
                disciplina=row.disciplina,
                fecha=row.fecha,
                hora_inicio=row.hora_inicio,
                hora_fin=row.hora_fin,
                profesor_nombre=row.profesor_nombre,
                sala_nombre=row.sala_nombre,
                monto_pagado=float(row.monto_pagado) if row.monto_pagado is not None else None,
                estado_pago=row.estado_pago,
                precio_clase=float(row.precio_clase) if row.precio_clase is not None else None,
                asistio=row.asistio,
                cancelo=row.cancelo,
            )
            for row in rows
        ]

    async def get_suscripciones(self, usuario_id: uuid.UUID) -> list[MiSuscripcionResponse]:
        await SuscripcionService(self.db).sync_user_subscriptions(usuario_id)
        suscripciones = await self.repo.get_suscripciones(usuario_id)
        result = []
        for s in suscripciones:
            t = s.clase_template
            instancias = await self.repo.get_instancias_de_suscripcion(
                t.id, s.fecha_inicio, s.fecha_fin
            )
            result.append(MiSuscripcionResponse(
                id=s.id,
                clase_template_id=t.id,
                clase_nombre=t.nombre,
                disciplina=t.disciplina,
                dia_semana=t.dia_semana,
                hora_inicio=t.hora_inicio,
                hora_fin=t.hora_fin,
                profesor_nombre=(
                    f"{t.profesor.nombre} {t.profesor.apellido}" if t.profesor else None
                ),
                sala_nombre=t.sala.nombre if t.sala else None,
                fecha_inicio=s.fecha_inicio,
                fecha_fin=s.fecha_fin,
                monto=float(s.monto),
                estado=s.estado,
                activo=s.activo,
                instancias=[
                    InstanciaEnSuscripcionResponse(
                        instancia_id=i.id,
                        fecha=i.fecha,
                        cancelada=i.cancelada,
                    )
                    for i in instancias
                ],
            ))
        return result
