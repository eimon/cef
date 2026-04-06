from fastapi import FastAPI, Request, HTTPException
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError
from fastapi.responses import JSONResponse
from .general import APIException
import logging

logger = logging.getLogger(__name__)


def api_exception_handler(request: Request, exc: APIException):
    logger.warning(f"[Servicio] {request.url.path}: {exc}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message},
    )


def http_exception_handler(request: Request, exc: HTTPException):
    logger.warning(f"[Router] {request.url.path}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"[BUG] {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno del servidor"},
    )


async def integrity_error_handler(request: Request, exc: IntegrityError):
    logger.error(f"[SQL] {request.url.path}: {exc}", exc_info=True)
    detail = "Conflicto de integridad en la base de datos."
    orig = str(exc.orig) if exc.orig else ""

    if "exclusion constraint" in orig or "exclude" in orig.lower():
        detail = "Las fechas se solapan con un registro existente."
    elif "foreign key" in orig.lower() or "restrict" in orig.lower():
        detail = "No se puede eliminar porque está en uso por otros registros."
    elif "check constraint" in orig.lower():
        if "checkout_after_checkin" in orig or "end_after_start" in orig:
            detail = "La fecha de fin debe ser posterior a la fecha de inicio."
        elif "non_negative" in orig or "positive" in orig:
            detail = "El valor numérico está fuera del rango permitido."
        else:
            detail = "Violación de restricción de datos."
    elif "unique" in orig.lower() or "duplicate" in orig.lower():
        detail = "Ya existe un registro con estos datos."

    return JSONResponse(
        status_code=409,
        content={"detail": detail},
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"[REQUEST] {request.url.path}: {exc}", exc_info=True)
    mensajes = []

    for err in exc.errors():
        msg = err.get("msg", "error")
        ctx_error = err.get("ctx", {}).get("error", "")
        loc = err.get("loc", [])
        loc_str = ".".join([str(x) for x in loc])
        input_data = err.get("input")

        if ctx_error:
            mensaje_final = f"{msg}: {ctx_error} (loc: {loc_str})"
        else:
            mensaje_final = f"{msg} (loc: {loc_str})"
        if input_data not in (None, {}, "", []):
            mensaje_final += f" — input: {input_data}"

        mensajes.append(mensaje_final)

    detalle = ", ".join(mensajes)

    return JSONResponse(status_code=422, content={"detail": detalle})


def register_exception_handlers(app: FastAPI):
    app.add_exception_handler(APIException, api_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
    app.add_exception_handler(IntegrityError, integrity_error_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
