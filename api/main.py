from fastapi import FastAPI
from core.config import settings
import models  # noqa: F401 — registers all ORM models before routers trigger configure_mappers()
from routers import auth, usuarios, clases, inscripciones, mis_clases, profesores, salas, config, suscripciones
from exceptions.handlers import register_exception_handlers
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)
register_exception_handlers(app)
app.include_router(auth.router)
app.include_router(usuarios.router)
app.include_router(clases.router)
app.include_router(inscripciones.router)
app.include_router(mis_clases.router)
app.include_router(profesores.router)
app.include_router(salas.router)
app.include_router(config.router)
app.include_router(suscripciones.router)

@app.get("/")
async def root():
    return {"message": "Bienvenido a la API Base", "project": settings.PROJECT_NAME}

@app.get("/health")
async def health_check():
    return {"status": "ok"}
