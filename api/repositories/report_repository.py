import uuid
from datetime import date, datetime, time

from sqlalchemy import and_, func, literal, select, union_all
from sqlalchemy.ext.asyncio import AsyncSession

from core.enums import EstadoPago, TipoInscripcion, UserRole
from models.asistencia import Asistencia
from models.clase_instancia import ClaseInstancia
from models.clase_template import ClaseTemplate
from models.pagos import Pago
from models.suscripciones import Suscripcion, SuscripcionReserva
from models.usuario import Usuario


class ReportRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def count_present_users_by_date(
        self,
        roles: list[UserRole],
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> list[tuple[date, int]]:
        created_at = func.coalesce(Usuario.created_at, func.now())
        event_date = func.date(created_at).label("event_date")
        period_count = func.count(Usuario.id).label("period_count")

        query = select(event_date, period_count).where(Usuario.role.in_(roles))
        if start_date:
            query = query.where(created_at >= datetime.combine(start_date, time.min))
        if end_date:
            query = query.where(created_at <= datetime.combine(end_date, time.max))

        result = await self.db.execute(query.group_by(event_date).order_by(event_date))

        return [(row.event_date, int(row.period_count)) for row in result.all()]

    async def count_deleted_users_by_date(
        self,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> list[tuple[date, int]]:
        deleted_at = func.coalesce(Usuario.updated_at, Usuario.created_at, func.now())
        event_date = func.date(deleted_at).label("event_date")
        period_count = func.count(Usuario.id).label("period_count")

        query = select(event_date, period_count).where(Usuario.activo.is_(False))
        if start_date:
            query = query.where(deleted_at >= datetime.combine(start_date, time.min))
        if end_date:
            query = query.where(deleted_at <= datetime.combine(end_date, time.max))

        result = await self.db.execute(query.group_by(event_date).order_by(event_date))

        return [(row.event_date, int(row.period_count)) for row in result.all()]

    async def count_paid_reservations_by_activity(
        self,
        start_date: date,
        end_date: date,
    ) -> list[tuple[date, str, int]]:
        individual_reservations = (
            select(
                ClaseInstancia.fecha.label("event_date"),
                ClaseTemplate.disciplina.label("activity"),
                Asistencia.id.label("reservation_id"),
            )
            .select_from(Asistencia)
            .join(ClaseInstancia, Asistencia.clase_instancia_id == ClaseInstancia.id)
            .join(ClaseTemplate, ClaseInstancia.clase_template_id == ClaseTemplate.id)
            .join(Usuario, Usuario.id == Asistencia.usuario_id)
            .join(
                Pago,
                and_(
                    Pago.usuario_id == Asistencia.usuario_id,
                    Pago.clase_instancia_id == Asistencia.clase_instancia_id,
                ),
            )
            .where(
                Usuario.role == UserRole.CLIENTE,
                Usuario.activo.is_(True),
                ClaseInstancia.activo.is_(True),
                ClaseInstancia.cancelada.is_(False),
                ClaseInstancia.fecha >= start_date,
                ClaseInstancia.fecha <= end_date,
                Asistencia.tipo == TipoInscripcion.INDIVIDUAL,
                Asistencia.cancelo.is_(False),
                Pago.activo.is_(True),
                Pago.estado == EstadoPago.PAGADO,
            )
            .distinct()
        )

        subscription_reservations = (
            select(
                ClaseInstancia.fecha.label("event_date"),
                ClaseTemplate.disciplina.label("activity"),
                SuscripcionReserva.id.label("reservation_id"),
            )
            .select_from(SuscripcionReserva)
            .join(Suscripcion, SuscripcionReserva.suscripcion_id == Suscripcion.id)
            .join(ClaseInstancia, SuscripcionReserva.clase_instancia_id == ClaseInstancia.id)
            .join(ClaseTemplate, ClaseInstancia.clase_template_id == ClaseTemplate.id)
            .join(Usuario, Usuario.id == Suscripcion.usuario_id)
            .join(Pago, Pago.suscripcion_id == Suscripcion.id)
            .where(
                Usuario.role == UserRole.CLIENTE,
                Usuario.activo.is_(True),
                ClaseInstancia.activo.is_(True),
                ClaseInstancia.cancelada.is_(False),
                ClaseInstancia.fecha >= start_date,
                ClaseInstancia.fecha <= end_date,
                SuscripcionReserva.activa.is_(True),
                Pago.activo.is_(True),
                Pago.estado == EstadoPago.PAGADO,
            )
            .distinct()
        )

        reservations = union_all(individual_reservations, subscription_reservations).subquery()
        total_count = func.count().label("total_count")

        result = await self.db.execute(
            select(reservations.c.event_date, reservations.c.activity, total_count)
            .group_by(reservations.c.event_date, reservations.c.activity)
            .order_by(reservations.c.event_date, reservations.c.activity)
        )

        return [(row.event_date, str(row.activity), int(row.total_count)) for row in result.all()]

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

    async def sum_paid_revenue_by_date(
        self,
        start_date: date,
        end_date: date,
    ) -> list[tuple[date, float]]:
        start_datetime = datetime.combine(start_date, time.min)
        end_datetime = datetime.combine(end_date, time.max)
        event_date = func.date(Pago.fecha_pago).label("event_date")
        total_revenue = func.sum(Pago.monto).label("total_revenue")

        result = await self.db.execute(
            select(event_date, total_revenue)
            .where(
                Pago.activo.is_(True),
                Pago.estado == EstadoPago.PAGADO,
                Pago.fecha_pago >= start_datetime,
                Pago.fecha_pago <= end_datetime,
            )
            .group_by(event_date)
            .order_by(event_date)
        )

        return [(row.event_date, float(row.total_revenue)) for row in result.all()]

    async def sum_paid_revenue_by_discipline_and_type(
        self,
        start_date: date,
        end_date: date,
    ) -> list[tuple[str, str, float]]:
        start_datetime = datetime.combine(start_date, time.min)
        end_datetime = datetime.combine(end_date, time.max)

        individual_revenue = (
            select(
                ClaseTemplate.disciplina.label("discipline"),
                literal("inscripcion").label("payment_type"),
                func.sum(Pago.monto).label("total_revenue"),
            )
            .select_from(Pago)
            .join(ClaseInstancia, Pago.clase_instancia_id == ClaseInstancia.id)
            .join(ClaseTemplate, ClaseInstancia.clase_template_id == ClaseTemplate.id)
            .where(
                Pago.activo.is_(True),
                Pago.estado == EstadoPago.PAGADO,
                Pago.fecha_pago >= start_datetime,
                Pago.fecha_pago <= end_datetime,
                Pago.clase_instancia_id.is_not(None),
                Pago.suscripcion_id.is_(None),
            )
            .group_by(ClaseTemplate.disciplina)
        )

        subscription_revenue = (
            select(
                ClaseTemplate.disciplina.label("discipline"),
                literal("suscripcion").label("payment_type"),
                func.sum(Pago.monto).label("total_revenue"),
            )
            .select_from(Pago)
            .join(Suscripcion, Pago.suscripcion_id == Suscripcion.id)
            .join(ClaseTemplate, Suscripcion.clase_template_id == ClaseTemplate.id)
            .where(
                Pago.activo.is_(True),
                Pago.estado == EstadoPago.PAGADO,
                Pago.fecha_pago >= start_datetime,
                Pago.fecha_pago <= end_datetime,
                Pago.suscripcion_id.is_not(None),
            )
            .group_by(ClaseTemplate.disciplina)
        )

        revenue = union_all(individual_revenue, subscription_revenue).subquery()
        total_revenue = func.sum(revenue.c.total_revenue).label("total_revenue")

        result = await self.db.execute(
            select(revenue.c.discipline, revenue.c.payment_type, total_revenue)
            .group_by(revenue.c.discipline, revenue.c.payment_type)
            .order_by(total_revenue.desc(), revenue.c.discipline, revenue.c.payment_type)
        )

        return [
            (str(row.discipline), str(row.payment_type), float(row.total_revenue))
            for row in result.all()
        ]

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

    async def count_class_cancellations_ranking(
        self,
        start_date: date,
        end_date: date,
    ) -> list[tuple[ClaseTemplate, int]]:
        total_count = func.count(Asistencia.id).label("total_count")

        result = await self.db.execute(
            select(ClaseTemplate, total_count)
            .select_from(ClaseTemplate)
            .outerjoin(
                ClaseInstancia,
                and_(
                    ClaseInstancia.clase_template_id == ClaseTemplate.id,
                    ClaseInstancia.fecha >= start_date,
                    ClaseInstancia.fecha <= end_date,
                    ClaseInstancia.activo.is_(True),
                ),
            )
            .outerjoin(
                Asistencia,
                and_(
                    Asistencia.clase_instancia_id == ClaseInstancia.id,
                    Asistencia.cancelo.is_(True),
                ),
            )
            .where(ClaseTemplate.activo.is_(True))
            .group_by(ClaseTemplate.id)
            .order_by(total_count.desc(), ClaseTemplate.disciplina, ClaseTemplate.dia_semana, ClaseTemplate.hora_inicio)
        )

        return [(row[0], int(row.total_count)) for row in result.all()]
