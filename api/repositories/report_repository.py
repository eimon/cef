import uuid
from datetime import date, datetime, time

from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.enums import EstadoPago, UserRole
from models.asistencia import Asistencia
from models.clase_instancia import ClaseInstancia
from models.clase_template import ClaseTemplate
from models.pagos import Pago
from models.usuario import Usuario


class ReportRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def count_present_users_by_month(self, roles: list[UserRole]) -> list[tuple[str, int]]:
        month_start = func.date_trunc("month", func.coalesce(Usuario.created_at, func.now()))
        period = func.to_char(month_start, "YYYY-MM").label("period")
        period_count = func.count(Usuario.id).label("period_count")

        result = await self.db.execute(
            select(period, period_count)
            .where(Usuario.role.in_(roles))
            .group_by(month_start)
            .order_by(month_start)
        )

        return [(str(row.period), int(row.period_count)) for row in result.all()]

    async def count_deleted_users_by_month(self) -> list[tuple[str, int]]:
        month_start = func.date_trunc(
            "month",
            func.coalesce(Usuario.updated_at, Usuario.created_at, func.now()),
        )
        period = func.to_char(month_start, "YYYY-MM").label("period")
        period_count = func.count(Usuario.id).label("period_count")

        result = await self.db.execute(
            select(period, period_count)
            .where(Usuario.activo.is_(False))
            .group_by(month_start)
            .order_by(month_start)
        )

        return [(str(row.period), int(row.period_count)) for row in result.all()]

    async def count_active_clients_by_activity(
        self,
        week_start: date,
        week_end: date,
    ) -> list[tuple[str, int]]:
        active_users = func.count(distinct(Asistencia.usuario_id)).label("total_count")

        result = await self.db.execute(
            select(ClaseTemplate.disciplina, active_users)
            .join(ClaseInstancia, ClaseInstancia.clase_template_id == ClaseTemplate.id)
            .join(Asistencia, Asistencia.clase_instancia_id == ClaseInstancia.id)
            .join(Usuario, Usuario.id == Asistencia.usuario_id)
            .where(
                Usuario.role == UserRole.CLIENTE,
                Usuario.activo.is_(True),
                ClaseInstancia.activo.is_(True),
                ClaseInstancia.cancelada.is_(False),
                ClaseInstancia.fecha >= week_start,
                ClaseInstancia.fecha <= week_end,
            )
            .group_by(ClaseTemplate.disciplina)
            .order_by(active_users.desc(), ClaseTemplate.disciplina)
        )

        return [(str(row.disciplina), int(row.total_count)) for row in result.all()]

    async def sum_paid_revenue_by_period(
        self,
        start_date: date,
        end_date: date,
    ) -> float | None:
        start_datetime = datetime.combine(start_date, time.min)
        end_datetime = datetime.combine(end_date, time.max)

        result = await self.db.execute(
            select(func.sum(Pago.monto))
            .where(
                Pago.activo.is_(True),
                Pago.estado == EstadoPago.PAGADO,
                Pago.fecha_pago >= start_datetime,
                Pago.fecha_pago <= end_datetime,
            )
        )

        total = result.scalar_one()
        return float(total) if total is not None else None

    async def list_available_classes(self) -> list[ClaseTemplate]:
        result = await self.db.execute(
            select(ClaseTemplate)
            .where(ClaseTemplate.activo.is_(True))
            .order_by(ClaseTemplate.disciplina, ClaseTemplate.dia_semana, ClaseTemplate.hora_inicio)
        )
        return list(result.scalars().all())

    async def get_available_class_by_id(self, clase_template_id: uuid.UUID) -> ClaseTemplate | None:
        result = await self.db.execute(
            select(ClaseTemplate).where(
                ClaseTemplate.id == clase_template_id,
                ClaseTemplate.activo.is_(True),
            )
        )
        return result.scalars().first()

    async def count_class_cancellations_by_date(
        self,
        clase_template_id: uuid.UUID,
        start_date: date,
        end_date: date,
    ) -> list[tuple[date, int]]:
        total_count = func.count(Asistencia.id).label("total_count")

        result = await self.db.execute(
            select(ClaseInstancia.fecha, total_count)
            .join(ClaseInstancia, Asistencia.clase_instancia_id == ClaseInstancia.id)
            .where(
                ClaseInstancia.clase_template_id == clase_template_id,
                ClaseInstancia.fecha >= start_date,
                ClaseInstancia.fecha <= end_date,
                Asistencia.cancelo.is_(True),
            )
            .group_by(ClaseInstancia.fecha)
            .order_by(ClaseInstancia.fecha)
        )

        return [(row.fecha, int(row.total_count)) for row in result.all()]
