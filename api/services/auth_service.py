import uuid
import json
from datetime import date, datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from exceptions.general import ConflictException, UnauthorizedException, BadRequestException, NotFoundException
from models.usuario import Usuario
from repositories.ficha_medica_repository import FichaMedicaRepository
from repositories.registration_token_repository import RegistrationTokenRepository
from repositories.email_change_token_repository import EmailChangeTokenRepository
from repositories.password_reset_token_repository import PasswordResetTokenRepository
from repositories.user_repository import UserRepository
from schemas.ficha_medica import FichaMedicaCreate, FichaMedicaPerfilResponse
from schemas.usuario import (
    PublicFichaMedicaRequest,
    PublicSignupRequest,
    Token,
    UsuarioCreate,
    UsuarioUpdate,
)
from services.email_service import EmailService
from services.refresh_token_service import RefreshTokenService
from core.security import verify_password, get_password_hash


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.registration_token_repo = RegistrationTokenRepository(db)
        self.email_change_token_repo = EmailChangeTokenRepository(db)
        self.password_reset_token_repo = PasswordResetTokenRepository(db)
        self.ficha_medica_repo = FichaMedicaRepository(db)

    async def register_user(self, data: UsuarioCreate) -> Usuario:
        if await self.user_repo.get_by_email(data.email):
            raise ConflictException("Email ya registrado")
        await self._validate_unique_optional_fields(data.dni, data.telefono)
        hashed_password = get_password_hash(data.password)
        return await self.user_repo.create(data, hashed_password)

    async def signup_user(self, data: PublicSignupRequest) -> None:
        if await self.user_repo.get_by_email(data.email):
            raise ConflictException("Email ya registrado")
        await self._validate_unique_optional_fields(data.dni, data.telefono)

        hashed_password = get_password_hash(data.password)
        usuario = await self.user_repo.create_public_signup(data, hashed_password)
        _, raw_token = await self.registration_token_repo.create(usuario.id)
        await EmailService().send_verification_email(usuario.email, raw_token)

    async def verify_email(self, raw_token: str) -> str:
        token = await self._get_valid_registration_token(raw_token)

        if token.completed_at is not None:
            raise BadRequestException("El registro ya fue completado")

        await self.registration_token_repo.mark_email_verified(token)
        usuario = await self.user_repo.get_by_id(token.usuario_id)
        if not usuario:
            raise UnauthorizedException("Usuario no encontrado")

        if usuario.email_verified_at is None:
            usuario.email_verified_at = datetime.now(timezone.utc)
            await self.db.flush()
            await self.db.refresh(usuario)

        return raw_token

    async def request_email_change(self, usuario_id: uuid.UUID, new_email: str) -> None:
        usuario = await self.user_repo.get_by_id(usuario_id)
        if not usuario:
            raise UnauthorizedException("Usuario no encontrado")

        if usuario.email.lower() == new_email.lower():
            raise BadRequestException("El email ingresado es igual al actual")

        if await self.user_repo.get_by_email(new_email):
            raise ConflictException("Email ya registrado")

        _, raw_token = await self.email_change_token_repo.create(usuario.id, new_email)
        await EmailService().send_email_change_verification(new_email, raw_token)

    async def request_password_reset(self, email: str) -> None:
        # Do not reveal whether the email exists
        usuario = await self.user_repo.get_by_email(email)
        if not usuario:
            return

        _, raw_token = await self.password_reset_token_repo.create(usuario.id)
        await EmailService().send_password_reset(usuario.email, raw_token)

    async def reset_password(self, raw_token: str, new_password: str) -> Usuario:
        token = await self.password_reset_token_repo.get_by_raw_token(raw_token)
        if not token:
            raise UnauthorizedException("Token inválido")
        if token.expires_at < datetime.now(timezone.utc):
            raise BadRequestException("El enlace de reseteo expiró")
        if token.used_at is not None:
            raise BadRequestException("El enlace ya fue utilizado")

        usuario = await self.user_repo.get_by_id(token.usuario_id)
        if not usuario:
            raise UnauthorizedException("Usuario no encontrado")

        if len(new_password) < 8:
            raise BadRequestException("La contraseña debe tener al menos 8 caracteres")
        if verify_password(new_password, usuario.hashed_password):
            raise BadRequestException("La contraseña no puede ser igual a la actual")

        usuario.hashed_password = get_password_hash(new_password)
        await self.password_reset_token_repo.mark_used(token)
        await self.db.flush()
        await self.db.refresh(usuario)
        return usuario

    async def confirm_email_change(self, raw_token: str) -> Usuario:
        token = await self.email_change_token_repo.get_by_raw_token(raw_token)
        if not token:
            raise UnauthorizedException("Token inválido")
        if token.expires_at < datetime.now(timezone.utc):
            raise BadRequestException("El enlace de confirmación expiró")
        if token.confirmed_at is not None:
            raise BadRequestException("El enlace ya fue utilizado")

        existing = await self.user_repo.get_by_email(token.new_email)
        if existing and existing.id != token.usuario_id:
            raise ConflictException("Email ya registrado")

        usuario = await self.user_repo.get_by_id(token.usuario_id)
        if not usuario:
            raise UnauthorizedException("Usuario no encontrado")

        usuario.email = token.new_email
        usuario.email_verified_at = datetime.now(timezone.utc)
        await self.email_change_token_repo.mark_confirmed(token)
        await self.db.flush()
        await self.db.refresh(usuario)
        return usuario

    async def complete_public_signup(
        self,
        data: PublicFichaMedicaRequest,
        device_hint: str | None = None,
    ) -> Token:
        token = await self._get_valid_registration_token(data.token)

        if token.email_verified_at is None:
            raise BadRequestException("Primero tenes que confirmar tu email")
        if token.completed_at is not None:
            raise BadRequestException("El registro ya fue completado")

        usuario = await self.user_repo.get_by_id(token.usuario_id)
        if not usuario:
            raise UnauthorizedException("Usuario no encontrado")

        existing_ficha = await self.ficha_medica_repo.get_by_usuario_id(usuario.id)
        if existing_ficha:
            raise ConflictException("La ficha medica ya fue cargada")

        ficha_data = FichaMedicaCreate(
            usuario_id=usuario.id,
            fecha=date.today(),
            cuerpo_ficha=data.cuerpo_ficha,
        )
        await self.ficha_medica_repo.create(ficha_data)

        usuario.activo = True
        usuario.registration_completed_at = datetime.now(timezone.utc)
        await self.registration_token_repo.mark_completed(token)
        await self.db.flush()
        await self.db.refresh(usuario)

        role = usuario.role.value if hasattr(usuario.role, "value") else usuario.role
        return await RefreshTokenService(self.db).create_token_pair(
            usuario_id=usuario.id,
            role=role,
            device_hint=device_hint,
        )

    async def authenticate_user(
        self, email: str, password: str, device_hint: str | None = None
    ) -> Token:
        usuario = await self.user_repo.get_by_email(email)
        if not usuario or not usuario.hashed_password:
            raise UnauthorizedException("Email o contrasena incorrectos")
        if not verify_password(password, usuario.hashed_password):
            raise UnauthorizedException("Email o contrasena incorrectos")
        if not usuario.activo:
            raise UnauthorizedException(
                "Tu cuenta todavia no esta activada. Revisa tu email y completa la ficha medica."
            )
        role = usuario.role.value if hasattr(usuario.role, "value") else usuario.role
        return await RefreshTokenService(self.db).create_token_pair(
            usuario_id=usuario.id,
            role=role,
            device_hint=device_hint,
        )

    async def change_password(
        self, usuario_id: uuid.UUID, current_password: str, new_password: str
    ) -> Usuario:
        usuario = await self.user_repo.get_by_id(usuario_id)
        if not usuario:
            raise UnauthorizedException("Usuario no encontrado")
        if not verify_password(current_password, usuario.hashed_password):
            raise BadRequestException("Contrasena actual incorrecta")
        usuario.hashed_password = get_password_hash(new_password)
        await self.db.flush()
        await self.db.refresh(usuario)
        return usuario

    async def update_profile(self, usuario_id: uuid.UUID, data: UsuarioUpdate) -> Usuario:
        if data.dni:
            existing = await self.user_repo.get_by_dni(data.dni)
            if existing and existing.id != usuario_id:
                raise ConflictException("DNI ya registrado")
        if data.telefono:
            existing = await self.user_repo.get_by_telefono(data.telefono)
            if existing and existing.id != usuario_id:
                raise ConflictException("Telefono ya registrado")

        update_data = UsuarioUpdate(
            **data.model_dump(
                include={
                    "telefono",
                    "nombre",
                    "apellido",
                    "fecha_nacimiento",
                    "dni",
                    "genero",
                },
                exclude_unset=True,
            )
        )
        usuario = await self.user_repo.update(usuario_id, update_data)
        if not usuario:
            raise UnauthorizedException("Usuario no encontrado")
        return usuario

    async def get_own_ficha_medica(self, usuario_id: uuid.UUID) -> FichaMedicaPerfilResponse:
        ficha = await self.ficha_medica_repo.get_by_usuario_id(usuario_id)
        if not ficha:
            raise NotFoundException("Ficha medica no encontrada")

        try:
            cuerpo_ficha = json.loads(ficha.cuerpo_ficha)
        except json.JSONDecodeError:
            cuerpo_ficha = {"contenido": ficha.cuerpo_ficha}

        return FichaMedicaPerfilResponse(
            id=ficha.id,
            fecha=ficha.fecha,
            cuerpo_ficha=cuerpo_ficha,
            created_at=ficha.created_at,
            updated_at=ficha.updated_at,
        )

    async def update_own_ficha_medica(
        self,
        usuario_id: uuid.UUID,
        cuerpo_ficha: str,
    ) -> FichaMedicaPerfilResponse:
        ficha = await self.ficha_medica_repo.update_by_usuario_id(usuario_id, cuerpo_ficha)
        if not ficha:
            raise NotFoundException("Ficha medica no encontrada")

        try:
            parsed_body = json.loads(ficha.cuerpo_ficha)
        except json.JSONDecodeError:
            parsed_body = {"contenido": ficha.cuerpo_ficha}

        return FichaMedicaPerfilResponse(
            id=ficha.id,
            fecha=ficha.fecha,
            cuerpo_ficha=parsed_body,
            created_at=ficha.created_at,
            updated_at=ficha.updated_at,
        )

    async def _validate_unique_optional_fields(
        self,
        dni: str | None,
        telefono: str | None,
    ) -> None:
        if dni and await self.user_repo.get_by_dni(dni):
            raise ConflictException("DNI ya registrado")
        if telefono and await self.user_repo.get_by_telefono(telefono):
            raise ConflictException("Telefono ya registrado")

    async def _get_valid_registration_token(self, raw_token: str):
        token = await self.registration_token_repo.get_by_raw_token(raw_token)
        if not token:
            raise UnauthorizedException("Token invalido")
        if token.expires_at < datetime.now(timezone.utc):
            raise UnauthorizedException("Token expirado")
        return token
