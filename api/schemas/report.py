from pydantic import BaseModel
from datetime import date
from uuid import UUID


class UserRegistrationsPoint(BaseModel):
    period: str
    total_count: int


class UserRegistrationsReportResponse(BaseModel):
    points: list[UserRegistrationsPoint]


class ActiveUsersByActivityPoint(BaseModel):
    activity: str
    total_count: int


class ActiveUsersByActivityReportResponse(BaseModel):
    points: list[ActiveUsersByActivityPoint]


class BillingReportRequest(BaseModel):
    start_date: date
    end_date: date


class BillingReportResponse(BaseModel):
    total_revenue: float
    message: str | None = None


class ReportClassOption(BaseModel):
    id: UUID
    nombre: str
    disciplina: str
    dia_semana: str
    hora_inicio: str
    hora_fin: str


class ClassCancellationsPoint(BaseModel):
    class_date: date
    total_count: int


class ClassCancellationsReportResponse(BaseModel):
    clase: ReportClassOption
    points: list[ClassCancellationsPoint]
