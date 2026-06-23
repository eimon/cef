import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    RECEPCION = "recepcion"
    CLIENTE = "cliente"


class TipoInscripcion(str, enum.Enum):
    INDIVIDUAL = "individual"
    SUSCRIPCION = "suscripcion"


class EstadoPago(str, enum.Enum):
    PENDIENTE = "pendiente"
    PAGADO = "pagado"
    ANULADO = "anulado"


class EstadoSuscripcion(str, enum.Enum):
    VIGENTE = "vigente"
    RENOVABLE = "renovable"
    VENCIDA = "vencida"


class DiaSemana(str, enum.Enum):
    LUNES = "lunes"
    MARTES = "martes"
    MIERCOLES = "miercoles"
    JUEVES = "jueves"
    VIERNES = "viernes"
    SABADO = "sabado"
    DOMINGO = "domingo"


class TipoLicencia(str, enum.Enum):
    VACACIONES = "vacaciones"
    ENFERMEDAD = "enfermedad"
    PERSONAL = "personal"
    ESTUDIO = "estudio"
    OTRO = "otro"


class EstadoLicencia(str, enum.Enum):
    PENDIENTE = "pendiente"
    APROBADA = "aprobada"
    RECHAZADA = "rechazada"
class EstadoWaitlist(str, enum.Enum):
    EN_ESPERA = "en_espera"
    NOTIFICADO = "notificado"
    CONFIRMADO_PAGADO = "confirmado_pagado"
    EXPIRADO = "expirado"
    CANCELADO = "cancelado"


