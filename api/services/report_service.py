import uuid
from collections.abc import Iterable
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from core.enums import UserRole
from exceptions.general import BadRequestException, NotFoundException
from repositories.report_repository import ReportRepository
from schemas.report import (
    ClassCancellationRankingItem,
    ActiveUsersByActivityPoint,
    ActiveUsersByActivityReportResponse,
    BillingReportPoint,
    BillingReportResponse,
    ClassCancellationsRankingResponse,
    ClassCancellationsPoint,
    ClassCancellationsReportResponse,
    ReportClassOption,
    UserRegistrationsPoint,
    UserRegistrationsReportResponse,
)

LOCAL_TZ = ZoneInfo("America/Argentina/Buenos_Aires")

GRANULARITY_LABELS = {
    "weekly": "Semanal",
    "monthly": "Mensual",
    "quarterly": "Trimestral",
    "semester": "Semestral",
}


class ReportService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ReportRepository(db)

    async def get_client_registrations_report(
        self,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> UserRegistrationsReportResponse:
        start_date, end_date = self._resolve_period(start_date, end_date, default_start=self._year_start())
        return await self._get_registrations_report([UserRole.CLIENTE], start_date, end_date)

    async def get_staff_registrations_report(
        self,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> UserRegistrationsReportResponse:
        start_date, end_date = self._resolve_period(start_date, end_date, default_start=self._year_start())
        return await self._get_registrations_report([UserRole.ADMIN, UserRole.RECEPCION], start_date, end_date)

    async def get_deleted_users_report(
        self,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> UserRegistrationsReportResponse:
        start_date, end_date = self._resolve_period(start_date, end_date, default_start=self._year_start())
        dated_counts = await self.repo.count_deleted_users_by_date(start_date, end_date)
        return self._cumulative_user_report(dated_counts, start_date, end_date)

    async def get_active_users_by_activity_report(
        self,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> ActiveUsersByActivityReportResponse:
        start_date, end_date = self._resolve_period(start_date, end_date)
        activity_counts = await self.repo.count_paid_reservations_by_activity(start_date, end_date)
        granularity = self._granularity_for(start_date, end_date)
        grouped: dict[tuple[str, str], int] = {}
        for event_date, activity, total_count in activity_counts:
            period = self._period_key(event_date, granularity)
            grouped[(period, activity)] = grouped.get((period, activity), 0) + total_count
        periods = self._period_keys(start_date, end_date, granularity)
        activities = sorted({activity for _, activity, _ in activity_counts})

        return ActiveUsersByActivityReportResponse(
            granularity=granularity,
            granularity_label=GRANULARITY_LABELS[granularity],
            points=[
                ActiveUsersByActivityPoint(
                    period=period,
                    activity=activity,
                    total_count=grouped.get((period, activity), 0),
                )
                for period in periods
                for activity in activities
            ],
        )

    async def get_billing_report(
        self,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> BillingReportResponse:
        today = datetime.now(LOCAL_TZ).date()
        start_date, end_date = self._resolve_period(
            start_date,
            end_date,
            default_start=today.replace(day=1),
            default_end=today,
        )

        granularity = self._granularity_for(start_date, end_date)
        revenue_counts = await self.repo.sum_paid_revenue_by_date(start_date, end_date)
        grouped = self._bucket_sum(revenue_counts, start_date, end_date, granularity)
        total_revenue = sum(grouped.values())
        if total_revenue is None:
            return BillingReportResponse(
                granularity=granularity,
                granularity_label=GRANULARITY_LABELS[granularity],
                total_revenue=0,
                points=[],
                message="No se registraron pagos en el período seleccionado",
            )

        return BillingReportResponse(
            granularity=granularity,
            granularity_label=GRANULARITY_LABELS[granularity],
            total_revenue=total_revenue,
            message="No se registraron pagos en el periodo seleccionado" if total_revenue == 0 else None,
            points=[
                BillingReportPoint(
                    period=period,
                    total_revenue=total,
                )
                for period, total in grouped.items()
            ],
        )

    async def list_report_classes(self) -> list[ReportClassOption]:
        classes = await self.repo.list_available_classes()
        return [self._class_option(clase) for clase in classes]

    async def get_class_cancellations_ranking_report(
        self,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> ClassCancellationsRankingResponse:
        start_date, end_date = self._resolve_period(start_date, end_date)
        ranking = await self.repo.count_class_cancellations_ranking(start_date, end_date)

        return ClassCancellationsRankingResponse(
            start_date=start_date,
            end_date=end_date,
            total_count=sum(total_count for _, total_count in ranking),
            items=[
                ClassCancellationRankingItem(
                    clase=self._class_option(clase),
                    total_count=total_count,
                )
                for clase, total_count in ranking
            ],
        )

    async def get_class_cancellations_report(
        self,
        clase_template_id: uuid.UUID,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> ClassCancellationsReportResponse:
        clase = await self.repo.get_available_class_by_id(clase_template_id)
        if not clase:
            raise NotFoundException("Clase no encontrada")

        start_date, end_date = self._resolve_period(start_date, end_date)
        granularity = self._granularity_for(start_date, end_date)
        cancellation_counts = await self.repo.count_class_cancellations_by_date(
            clase_template_id,
            start_date,
            end_date,
        )
        grouped = self._bucket_sum(cancellation_counts, start_date, end_date, granularity)

        return ClassCancellationsReportResponse(
            granularity=granularity,
            granularity_label=GRANULARITY_LABELS[granularity],
            clase=self._class_option(clase),
            points=[
                ClassCancellationsPoint(
                    period=period,
                    total_count=int(total_count),
                )
                for period, total_count in grouped.items()
            ],
        )

    async def _get_registrations_report(
        self,
        roles: list[UserRole],
        start_date: date | None,
        end_date: date | None,
    ) -> UserRegistrationsReportResponse:
        dated_counts = await self.repo.count_present_users_by_date(roles, start_date, end_date)
        return self._cumulative_user_report(dated_counts, start_date, end_date)

    def _resolve_period(
        self,
        start_date: date | None,
        end_date: date | None,
        *,
        default_start: date | None = None,
        default_end: date | None = None,
    ) -> tuple[date, date]:
        today = datetime.now(LOCAL_TZ).date()
        resolved_end = end_date or default_end or today
        resolved_start = start_date or default_start or (resolved_end - timedelta(days=29))
        self._validate_period(resolved_start, resolved_end)
        return resolved_start, resolved_end

    def _validate_period(self, start_date: date | None, end_date: date | None) -> None:
        if start_date and end_date and start_date > end_date:
            raise BadRequestException("La fecha de inicio no puede ser posterior a la fecha de fin")

    def _year_start(self) -> date:
        return datetime.now(LOCAL_TZ).date().replace(month=1, day=1)

    def _granularity_for(self, start_date: date, end_date: date) -> str:
        total_days = (end_date - start_date).days + 1
        if total_days <= 31:
            return "weekly"
        return "monthly"

    def _cumulative_user_report(
        self,
        dated_counts: list[tuple[date, int]],
        start_date: date,
        end_date: date,
    ) -> UserRegistrationsReportResponse:
        granularity = self._granularity_for(start_date, end_date)
        grouped = self._bucket_sum(dated_counts, start_date, end_date, granularity)
        cumulative = 0
        points: list[UserRegistrationsPoint] = []
        for period, period_count in grouped.items():
            cumulative += period_count
            points.append(
                UserRegistrationsPoint(
                    period=period,
                    total_count=cumulative,
                )
            )

        return UserRegistrationsReportResponse(
            granularity=granularity,
            granularity_label=GRANULARITY_LABELS[granularity],
            points=points,
        )

    def _bucket_sum(
        self,
        dated_counts: Iterable[tuple[date, int | float]],
        start_date: date,
        end_date: date,
        granularity: str,
    ) -> dict[str, int | float]:
        grouped: dict[str, int | float] = {
            period: 0 for period in self._period_keys(start_date, end_date, granularity)
        }
        for event_date, total_count in dated_counts:
            period = self._period_key(event_date, granularity)
            if period in grouped:
                grouped[period] += total_count
        return grouped

    def _period_keys(self, start_date: date, end_date: date, granularity: str) -> list[str]:
        current = self._period_start(start_date, granularity)
        keys: list[str] = []
        while current <= end_date:
            keys.append(self._period_key(current, granularity))
            current = self._next_period_start(current, granularity)
        return keys

    def _period_key(self, value: date, granularity: str) -> str:
        if granularity == "weekly":
            return self._period_start(value, granularity).isoformat()
        if granularity == "monthly":
            return f"{value.year:04d}-{value.month:02d}"
        if granularity == "quarterly":
            quarter = ((value.month - 1) // 3) + 1
            return f"{value.year:04d}-Q{quarter}"
        if granularity == "semester":
            semester = 1 if value.month <= 6 else 2
            return f"{value.year:04d}-S{semester}"
        raise BadRequestException("Granularidad de reporte invalida")

    def _period_start(self, value: date, granularity: str) -> date:
        if granularity == "weekly":
            return value - timedelta(days=value.weekday())
        if granularity == "monthly":
            return value.replace(day=1)
        if granularity == "quarterly":
            first_month = ((value.month - 1) // 3) * 3 + 1
            return value.replace(month=first_month, day=1)
        if granularity == "semester":
            first_month = 1 if value.month <= 6 else 7
            return value.replace(month=first_month, day=1)
        raise BadRequestException("Granularidad de reporte invalida")

    def _next_period_start(self, value: date, granularity: str) -> date:
        if granularity == "weekly":
            return value + timedelta(days=7)
        if granularity == "monthly":
            return self._add_months(value, 1)
        if granularity == "quarterly":
            return self._add_months(value, 3)
        if granularity == "semester":
            return self._add_months(value, 6)
        raise BadRequestException("Granularidad de reporte invalida")

    def _add_months(self, value: date, months: int) -> date:
        month_index = value.month - 1 + months
        year = value.year + month_index // 12
        month = month_index % 12 + 1
        return value.replace(year=year, month=month, day=1)

    def _class_option(self, clase) -> ReportClassOption:
        return ReportClassOption(
            id=clase.id,
            nombre=clase.nombre,
            disciplina=clase.disciplina,
            dia_semana=clase.dia_semana.value,
            hora_inicio=clase.hora_inicio.strftime("%H:%M"),
            hora_fin=clase.hora_fin.strftime("%H:%M"),
        )
