class APIException(Exception):
    def __init__(self, message: str = "Error en la API", status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

    def __str__(self):
        return f"{self.__class__.__name__} ({self.status_code}): {self.message}"


# === HTTP Standard Exceptions ===

class NotFoundException(APIException):
    def __init__(self, message: str = "Recurso no encontrado"):
        super().__init__(message, status_code=404)


class ForbiddenException(APIException):
    def __init__(self, message: str = "No autorizado"):
        super().__init__(message, status_code=403)


class UnauthorizedException(APIException):
    def __init__(self, message: str = "Credenciales inválidas"):
        super().__init__(message, status_code=401)


class BadRequestException(APIException):
    def __init__(self, message: str = "Solicitud inválida"):
        super().__init__(message, status_code=400)


class ConflictException(APIException):
    def __init__(self, message: str = "Conflicto con el estado actual"):
        super().__init__(message, status_code=409)


class ProfesorReactivableException(APIException):
    def __init__(self, profesor_id: str, nombre: str, apellido: str, genero: str):
        self.profesor_id = profesor_id
        self.nombre = nombre
        self.apellido = apellido
        self.genero = genero
        super().__init__("Existe un profesor dado de baja con ese DNI", status_code=409)


class ClaseConInscriptosException(APIException):
    def __init__(self):
        super().__init__("La clase tiene clientes inscriptos y no puede ser eliminada", status_code=409)


class SalaOcupadaException(APIException):
    def __init__(self):
        super().__init__("La sala se encuentra ocupada en ese horario", status_code=409)


class ProfesorOcupadoException(APIException):
    def __init__(self):
        super().__init__("El profesor se encuentra ocupado en ese horario", status_code=409)


# === Business Logic Exceptions ===

class ValidacionDatosException(APIException):
    def __init__(self, message: str = "Error de validación de datos", extra: str = "", status_code: int = 400):
        if extra:
            message += f": {extra}"
        super().__init__(message, status_code)


class ImportarArchivoCsvException(APIException):
    def __init__(self, message: str = "Error al importar el archivo CSV", extra: str = "", status_code: int = 400):
        if extra:
            message += f": {extra}"
        super().__init__(message, status_code)
