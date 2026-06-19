from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.roles import Role
from dependencies.auth import has_role
from models.usuario import Usuario
from schemas.report import (
    ActiveUsersByActivityReportResponse,
    BillingReportResponse,
    ClassCancellationsReportResponse,
    ReportClassOption,
    UserRegistrationsReportResponse,
)
from services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/clients-registrations", response_model=UserRegistrationsReportResponse)
async def get_client_registrations_report(
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(has_role(Role.ROLE_ADMIN)),
):
    return await ReportService(db).get_client_registrations_report()


@router.get("/staff-registrations", response_model=UserRegistrationsReportResponse)
async def get_staff_registrations_report(
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(has_role(Role.ROLE_ADMIN)),
):
    return await ReportService(db).get_staff_registrations_report()


@router.get("/deleted-users", response_model=UserRegistrationsReportResponse)
async def get_deleted_users_report(
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(has_role(Role.ROLE_ADMIN)),
):
    return await ReportService(db).get_deleted_users_report()


@router.get("/active-users-by-activity", response_model=ActiveUsersByActivityReportResponse)
async def get_active_users_by_activity_report(
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(has_role(Role.ROLE_ADMIN)),
):
    return await ReportService(db).get_active_users_by_activity_report()


@router.get("/billing", response_model=BillingReportResponse)
async def get_billing_report(
    start_date: date,
    end_date: date,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(has_role(Role.ROLE_ADMIN)),
):
    return await ReportService(db).get_billing_report(start_date, end_date)


@router.get("/classes", response_model=list[ReportClassOption])
async def list_report_classes(
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(has_role(Role.ROLE_ADMIN)),
):
    return await ReportService(db).list_report_classes()


@router.get("/class-cancellations/{clase_template_id}", response_model=ClassCancellationsReportResponse)
async def get_class_cancellations_report(
    clase_template_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(has_role(Role.ROLE_ADMIN)),
):
    return await ReportService(db).get_class_cancellations_report(clase_template_id)
