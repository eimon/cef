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
