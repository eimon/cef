from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import date, timedelta

from core.enums import EstadoSuscripcion


RENOVABLE_AFTER_DAYS = 30
RENEWAL_WINDOW_DAYS = 10


class SuscripcionState(ABC):
    estado: EstadoSuscripcion

    @abstractmethod
    def next_state(self, fecha_pago: date, today: date) -> EstadoSuscripcion:
        pass

    @abstractmethod
    def can_renew(self) -> bool:
        pass


class VigenteState(SuscripcionState):
    estado = EstadoSuscripcion.VIGENTE

    def next_state(self, fecha_pago: date, today: date) -> EstadoSuscripcion:
        if today > fecha_pago + timedelta(days=RENOVABLE_AFTER_DAYS + RENEWAL_WINDOW_DAYS):
            return EstadoSuscripcion.VENCIDA
        if today >= fecha_pago + timedelta(days=RENOVABLE_AFTER_DAYS):
            return EstadoSuscripcion.RENOVABLE
        return self.estado

    def can_renew(self) -> bool:
        return False


class RenovableState(SuscripcionState):
    estado = EstadoSuscripcion.RENOVABLE

    def next_state(self, fecha_pago: date, today: date) -> EstadoSuscripcion:
        if today > fecha_pago + timedelta(days=RENOVABLE_AFTER_DAYS + RENEWAL_WINDOW_DAYS):
            return EstadoSuscripcion.VENCIDA
        return self.estado

    def can_renew(self) -> bool:
        return True


class VencidaState(SuscripcionState):
    estado = EstadoSuscripcion.VENCIDA

    def next_state(self, fecha_pago: date, today: date) -> EstadoSuscripcion:
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


def renewal_window(fecha_pago: date) -> tuple[date, date]:
    desde = fecha_pago + timedelta(days=RENOVABLE_AFTER_DAYS)
    hasta = desde + timedelta(days=RENEWAL_WINDOW_DAYS)
    return desde, hasta
