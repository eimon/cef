from pydantic import BaseModel
from datetime import date
from uuid import UUID


class UserRegistrationsPoint(BaseModel):
    period: str
    total_count: int


class UserRegistrationsReportResponse(BaseModel):
    granularity: str
    granularity_label: str
    points: list[UserRegistrationsPoint]


class ActiveUsersByActivityPoint(BaseModel):
    period: str
    activity: str
    total_count: int


class ActiveUsersByActivityReportResponse(BaseModel):
    granularity: str
    granularity_label: str
    points: list[ActiveUsersByActivityPoint]


class BillingReportRequest(BaseModel):
    start_date: date
    end_date: date


class BillingReportPoint(BaseModel):
    period: str
    total_revenue: float


class BillingReportResponse(BaseModel):
    granularity: str
    granularity_label: str
    total_revenue: float
    message: str | None = None
    points: list[BillingReportPoint]


class ReportClassOption(BaseModel):
    id: UUID
    nombre: str
    disciplina: str
    dia_semana: str
    hora_inicio: str
    hora_fin: str


class ClassCancellationsPoint(BaseModel):
    period: str
    total_count: int


class ClassCancellationsReportResponse(BaseModel):
    granularity: str
    granularity_label: str
    clase: ReportClassOption
    points: list[ClassCancellationsPoint]
