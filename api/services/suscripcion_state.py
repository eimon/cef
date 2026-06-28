from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import date, timedelta

from core.enums import EstadoSuscripcion


# With date-only payments, the renewal starts on the same day number of the next
# month-like period: 10/5 -> 10/6, then stays open for 10 days.
RENOVABLE_AFTER_DAYS = 31
RENEWAL_WINDOW_DAYS = 10


class SuscripcionState(ABC):
    estado: EstadoSuscripcion

    @abstractmethod
    def next_state(self, fecha_pago: date, today: date, renewal_window_days: int = RENEWAL_WINDOW_DAYS) -> EstadoSuscripcion:
        pass

    @abstractmethod
    def can_renew(self) -> bool:
        pass


class VigenteState(SuscripcionState):
    estado = EstadoSuscripcion.VIGENTE

    def next_state(self, fecha_pago: date, today: date, renewal_window_days: int = RENEWAL_WINDOW_DAYS) -> EstadoSuscripcion:
        if today > fecha_pago + timedelta(days=RENOVABLE_AFTER_DAYS + renewal_window_days):
            return EstadoSuscripcion.VENCIDA
        if today >= fecha_pago + timedelta(days=RENOVABLE_AFTER_DAYS):
            return EstadoSuscripcion.RENOVABLE
        return self.estado

    def can_renew(self) -> bool:
        return False


class RenovableState(SuscripcionState):
    estado = EstadoSuscripcion.RENOVABLE

    def next_state(self, fecha_pago: date, today: date, renewal_window_days: int = RENEWAL_WINDOW_DAYS) -> EstadoSuscripcion:
        if today > fecha_pago + timedelta(days=RENOVABLE_AFTER_DAYS + renewal_window_days):
            return EstadoSuscripcion.VENCIDA
        return self.estado

    def can_renew(self) -> bool:
        return True


class VencidaState(SuscripcionState):
    estado = EstadoSuscripcion.VENCIDA

    def next_state(self, fecha_pago: date, today: date, renewal_window_days: int = RENEWAL_WINDOW_DAYS) -> EstadoSuscripcion:
        return self.estado

    def can_renew(self) -> bool:
        return False


_STATES: dict[EstadoSuscripcion, SuscripcionState] = {
    EstadoSuscripcion.VIGENTE: VigenteState(),
    EstadoSuscripcion.RENOVABLE: RenovableState(),
    EstadoSuscripcion.VENCIDA: VencidaState(),
}


def get_subscription_state(estado: EstadoSuscripcion) -> SuscripcionState:
    return _STATES[estado]


def renewal_window(fecha_pago: date, renewal_window_days: int = RENEWAL_WINDOW_DAYS) -> tuple[date, date]:
    desde = fecha_pago + timedelta(days=RENOVABLE_AFTER_DAYS)
    hasta = desde + timedelta(days=renewal_window_days)
    return desde, hasta
