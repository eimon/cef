from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from schemas.configuracion import ConfiguracionResponse, SenaMinimaUpdate, DiasUpdate
from services.configuracion_service import ConfiguracionService
from core.database import get_db
from dependencies.auth import get_current_user, has_role
from core.roles import Role
from models.usuario import Usuario

router = APIRouter(prefix="/config", tags=["config"])


@router.get("/sena-minima", response_model=ConfiguracionResponse)
async def get_sena_minima(
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    return await ConfiguracionService(db).get_sena_minima()


@router.put("/sena-minima", response_model=ConfiguracionResponse)
async def update_sena_minima(
    data: SenaMinimaUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(has_role(Role.ROLE_CONFIG_UPDATE)),
):
    return await ConfiguracionService(db).update_sena_minima(data)


@router.get("/plazo-pago", response_model=ConfiguracionResponse)
async def get_plazo_pago(
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(has_role(Role.ROLE_ADMIN)),
):
    return await ConfiguracionService(db).get_plazo_pago_dias()


@router.put("/plazo-pago", response_model=ConfiguracionResponse)
async def update_plazo_pago(
    data: DiasUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(has_role(Role.ROLE_ADMIN)),
):
    return await ConfiguracionService(db).update_plazo_pago_dias(data)


@router.get("/dias-aviso-vencimiento", response_model=ConfiguracionResponse)
async def get_dias_aviso(
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(has_role(Role.ROLE_ADMIN)),
):
    return await ConfiguracionService(db).get_dias_aviso_vencimiento()


@router.put("/dias-aviso-vencimiento", response_model=ConfiguracionResponse)
async def update_dias_aviso(
    data: DiasUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(has_role(Role.ROLE_ADMIN)),
):
    return await ConfiguracionService(db).update_dias_aviso_vencimiento(data)
