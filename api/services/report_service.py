import uuid
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from core.enums import UserRole
from exceptions.general import BadRequestException, NotFoundException
from repositories.report_repository import ReportRepository
from schemas.report import (
    ActiveUsersByActivityPoint,
    ActiveUsersByActivityReportResponse,
    BillingReportResponse,
    ClassCancellationsPoint,
    ClassCancellationsReportResponse,
    ReportClassOption,
    UserRegistrationsPoint,
    UserRegistrationsReportResponse,
)

LOCAL_TZ = ZoneInfo("America/Argentina/Buenos_Aires")

WEEKDAY_BY_DIA_SEMANA = {
    "lunes": 0,
    "martes": 1,
    "miercoles": 2,
    "jueves": 3,
    "viernes": 4,
    "sabado": 5,
    "domingo": 6,
}


class ReportService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ReportRepository(db)

    async def get_client_registrations_report(self) -> UserRegistrationsReportResponse:
        return await self._get_registrations_report([UserRole.CLIENTE])

    async def get_staff_registrations_report(self) -> UserRegistrationsReportResponse:
        return await self._get_registrations_report([UserRole.ADMIN, UserRole.RECEPCION])

    async def get_deleted_users_report(self) -> UserRegistrationsReportResponse:
        monthly_counts = await self.repo.count_deleted_users_by_month()
        return self._cumulative_user_report(monthly_counts)

    async def get_active_users_by_activity_report(self) -> ActiveUsersByActivityReportResponse:
        today = datetime.now(LOCAL_TZ).date()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)
        activity_counts = await self.repo.count_active_clients_by_activity(week_start, week_end)

        return ActiveUsersByActivityReportResponse(
            points=[
                ActiveUsersByActivityPoint(
                    activity=activity,
                    total_count=total_count,
                )
                for activity, total_count in activity_counts
            ],
        )

    async def get_billing_report(self, start_date: date, end_date: date) -> BillingReportResponse:
        if start_date > end_date:
            raise BadRequestException("La fecha de inicio no puede ser posterior a la fecha de fin")

        total_revenue = await self.repo.sum_paid_revenue_by_period(start_date, end_date)
        if total_revenue is None:
            return BillingReportResponse(
                total_revenue=0,
                message="No se registraron pagos en el período seleccionado",
            )

        return BillingReportResponse(
            total_revenue=total_revenue,
        )

    async def list_report_classes(self) -> list[ReportClassOption]:
        classes = await self.repo.list_available_classes()
        return [self._class_option(clase) for clase in classes]

    async def get_class_cancellations_report(
        self,
        clase_template_id: uuid.UUID,
    ) -> ClassCancellationsReportResponse:
        clase = await self.repo.get_available_class_by_id(clase_template_id)
        if not clase:
            raise NotFoundException("Clase no encontrada")

        today = datetime.now(LOCAL_TZ).date()
        start_date = today - timedelta(days=29)
        cancellation_counts = dict(
            await self.repo.count_class_cancellations_by_date(
                clase_template_id,
                start_date,
                today,
            )
        )
        class_dates = self._scheduled_dates_in_range(
            start_date,
            today,
            WEEKDAY_BY_DIA_SEMANA[clase.dia_semana.value],
        )

        return ClassCancellationsReportResponse(
            clase=self._class_option(clase),
            points=[
                ClassCancellationsPoint(
                    class_date=class_date,
                    total_count=cancellation_counts.get(class_date, 0),
                )
                for class_date in class_dates
            ],
        )

    async def _get_registrations_report(self, roles: list[UserRole]) -> UserRegistrationsReportResponse:
        monthly_counts = await self.repo.count_present_users_by_month(roles)
        return self._cumulative_user_report(monthly_counts)

    def _cumulative_user_report(self, monthly_counts: list[tuple[str, int]]) -> UserRegistrationsReportResponse:
        cumulative = 0
        points: list[UserRegistrationsPoint] = []
        for period, period_count in monthly_counts:
            cumulative += period_count
            points.append(
                UserRegistrationsPoint(
                    period=period,
                    total_count=cumulative,
                )
            )

        return UserRegistrationsReportResponse(
            points=points,
        )

    def _class_option(self, clase) -> ReportClassOption:
        return ReportClassOption(
            id=clase.id,
            nombre=clase.nombre,
            disciplina=clase.disciplina,
            dia_semana=clase.dia_semana.value,
            hora_inicio=clase.hora_inicio.strftime("%H:%M"),
            hora_fin=clase.hora_fin.strftime("%H:%M"),
        )

    def _scheduled_dates_in_range(
        self,
        start_date: date,
        end_date: date,
        weekday: int,
    ) -> list[date]:
        days_until_first = (weekday - start_date.weekday()) % 7
        current_date = start_date + timedelta(days=days_until_first)

        dates: list[date] = []
        while current_date <= end_date:
            dates.append(current_date)
            current_date += timedelta(days=7)

        return dates
