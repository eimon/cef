import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    RECEPCION = "recepcion"
    CLIENTE = "cliente"


class EstadoPago(str, enum.Enum):
    PENDIENTE = "pendiente"
    PAGADO = "pagado"
    ANULADO = "anulado"


class DiaSemana(str, enum.Enum):
    LUNES = "lunes"
    MARTES = "martes"
    MIERCOLES = "miercoles"
    JUEVES = "jueves"
    VIERNES = "viernes"
    SABADO = "sabado"
    DOMINGO = "domingo"