from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from schemas.usuario import (
    UsuarioCreate,
    UsuarioResponse,
    Token,
    RefreshRequest,
    LogoutRequest,
    ChangePasswordRequest,
    LoginRequest,
    PublicSignupRequest,
    PublicSignupResponse,
    VerifyEmailRequest,
    VerifyEmailResponse,
    EmailChangeRequest,
    EmailChangeRequestResponse,
    EmailChangeConfirmRequest,
    EmailChangeConfirmResponse,
    PublicFichaMedicaRequest,
    UsuarioUpdate,
)
from schemas.ficha_medica import FichaMedicaPerfilResponse, FichaMedicaUpdateRequest
from services.auth_service import AuthService
from services.refresh_token_service import RefreshTokenService
from core.database import get_db
from dependencies.auth import get_current_user
from models.usuario import Usuario
from core.roles import Role
from dependencies.auth import has_role

router = APIRouter(prefix="/auth", tags=["auth"])


def _device_hint(request: Request) -> str | None:
    user_agent = request.headers.get("user-agent", "")
    return user_agent[:255] if user_agent else None


@router.post("/register", response_model=UsuarioResponse)
async def register(
    user_in: UsuarioCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(has_role(Role.ROLE_ADMIN)),
):
    """Register a new user."""
    return await AuthService(db).register_user(user_in)


@router.post("/signup", response_model=PublicSignupResponse, status_code=201)
async def signup(
    user_in: PublicSignupRequest,
    db: AsyncSession = Depends(get_db),
):
    """Public signup. Creates an inactive client account and sends email verification."""
    await AuthService(db).signup_user(user_in)
    return {"detail": "Te enviamos un email para confirmar tu cuenta"}


@router.post("/verify-email", response_model=VerifyEmailResponse)
async def verify_email(
    body: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
):
    """Verify public signup email. Does not create a session."""
    onboarding_token = await AuthService(db).verify_email(body.token)
    return {
        "detail": "Email confirmado. Completa tu ficha medica para activar la cuenta",
        "onboarding_token": onboarding_token,
    }


@router.post("/email/change", response_model=EmailChangeRequestResponse)
async def request_email_change(
    body: EmailChangeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Request email change and send confirmation link to the new email."""
    await AuthService(db).request_email_change(current_user.id, body.new_email)
    return {"detail": "Te enviamos un email para confirmar el cambio de email"}


@router.post("/email/change/confirm", response_model=EmailChangeConfirmResponse)
async def confirm_email_change(
    body: EmailChangeConfirmRequest,
    db: AsyncSession = Depends(get_db),
):
    """Confirm the email change using the provided token."""
    usuario = await AuthService(db).confirm_email_change(body.token)
    return {"detail": "Tu email fue confirmado y actualizado correctamente", "email": usuario.email}


@router.post("/signup/ficha-medica", response_model=Token)
async def complete_signup_ficha_medica(
    request: Request,
    body: PublicFichaMedicaRequest,
    db: AsyncSession = Depends(get_db),
):
    """Complete medical record and issue the first session."""
    return await AuthService(db).complete_public_signup(
        body,
        device_hint=_device_hint(request),
    )


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Login and get access + refresh token pair."""
    return await AuthService(db).authenticate_user(
        body.email,
        body.password,
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


@router.put("/perfil", response_model=UsuarioResponse)
async def update_perfil(
    body: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Change current user's password."""
    return await AuthService(db).change_password(
        current_user.id, body.current_password, body.new_password
    )


@router.patch("/perfil", response_model=UsuarioResponse)
async def update_datos_perfil(
    body: UsuarioUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Update current user's personal data."""
    return await AuthService(db).update_profile(current_user.id, body)


@router.get("/perfil", response_model=UsuarioResponse)
async def perfil(current_user: Usuario = Depends(get_current_user)):
    """Get current user profile."""
    return current_user


@router.get("/perfil/ficha-medica", response_model=FichaMedicaPerfilResponse)
async def perfil_ficha_medica(
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Get current user's medical record."""
    return await AuthService(db).get_own_ficha_medica(current_user.id)


@router.put("/perfil/ficha-medica", response_model=FichaMedicaPerfilResponse)
async def update_perfil_ficha_medica(
    body: FichaMedicaUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Update current user's medical record."""
    return await AuthService(db).update_own_ficha_medica(current_user.id, body.cuerpo_ficha)
