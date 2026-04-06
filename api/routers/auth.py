from fastapi import APIRouter, Depends, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from schemas.user import UserCreate, UserResponse, Token, RefreshRequest, LogoutRequest, ChangePasswordRequest
from services.auth_service import AuthService
from services.refresh_token_service import RefreshTokenService
from core.database import get_db
from dependencies.auth import get_current_user
from models.user import User as Usuario
from core.roles import Role
from dependencies.auth import has_role

router = APIRouter(prefix="/auth", tags=["auth"])


def _device_hint(request: Request) -> str | None:
    user_agent = request.headers.get("user-agent", "")
    return user_agent[:255] if user_agent else None


@router.post("/register", response_model=UserResponse)
async def register(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(has_role(Role.ROLE_ADMIN)),
):
    """Register a new user."""
    return await AuthService(db).register_user(user_in)


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """Login and get access + refresh token pair."""
    return await AuthService(db).authenticate_user(
        form_data.username,
        form_data.password,
        device_hint=_device_hint(request),
    )


@router.post("/refresh", response_model=Token)
async def refresh(
    request: Request,
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    """Exchange a refresh token for a new access + refresh token pair."""
    return await RefreshTokenService(db).rotate(
        body.refresh_token,
        device_hint=_device_hint(request),
    )


@router.post("/logout", status_code=200)
async def logout(
    body: LogoutRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Revoke the provided refresh token. Idempotent."""
    await RefreshTokenService(db).revoke(body.refresh_token)
    return {"detail": "Sesión cerrada"}


@router.put("/perfil", response_model=UserResponse)
async def update_perfil(
    body: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Change current user's password."""
    return await AuthService(db).change_password(
        current_user.id, body.current_password, body.new_password
    )


@router.get("/perfil", response_model=UserResponse)
async def perfil(current_user: Usuario = Depends(get_current_user)):
    """Get current user profile."""
    return current_user
