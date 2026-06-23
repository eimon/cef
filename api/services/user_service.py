from models.usuario import Usuario
from schemas.usuario import UsuarioUpdate, AvisoMasivoResponse
from repositories.user_repository import UserRepository
from services.email_service import EmailService
from exceptions.general import NotFoundException, BadRequestException, ConflictException, ForbiddenException
from sqlalchemy.ext.asyncio import AsyncSession
from core.enums import UserRole
from services.waitlist_service import WaitlistService
import uuid
from datetime import datetime
from zoneinfo import ZoneInfo

LOCAL_TZ = ZoneInfo("America/Argentina/Buenos_Aires")


class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = UserRepository(db)

    async def list(
        self,
        skip: int = 0,
        limit: int = 100,
        dni: str | None = None,
        nombre: str | None = None,
        apellido: str | None = None,
        current_user: Usuario | None = None,
    ) -> list[Usuario]:
        usuarios = await self.repo.get_all(skip, limit, dni, nombre, apellido)
        if current_user and self._role_value(current_user.role) != UserRole.ADMIN.value:
            usuarios = [
                usuario
                for usuario in usuarios
                if self._role_value(usuario.role) == UserRole.CLIENTE.value
            ]
        if (dni or nombre or apellido) and not usuarios:
            raise NotFoundException("No se encuentran usuarios")
        return usuarios

    async def get(self, usuario_id: uuid.UUID, current_user: Usuario | None = None) -> Usuario:
        usuario = await self.repo.get_by_id(usuario_id)
        if not usuario:
            raise NotFoundException("Usuario no encontrado")
        if current_user and self._role_value(current_user.role) != UserRole.ADMIN.value:
            if self._role_value(usuario.role) != UserRole.CLIENTE.value:
                raise ForbiddenException("No autorizado para esta accion")
        return usuario

    async def update(self, usuario_id: uuid.UUID, data: UsuarioUpdate, current_user: Usuario | None = None) -> Usuario:
        usuario = await self.repo.get_by_id(usuario_id)
        if not usuario:
            raise NotFoundException("Usuario no encontrado")

        if current_user and self._role_value(current_user.role) != UserRole.ADMIN.value:
            if self._role_value(usuario.role) != UserRole.CLIENTE.value:
                raise ForbiddenException("No autorizado para esta accion")
            if data.role and data.role != UserRole.CLIENTE:
                raise ForbiddenException("Solo puede editar usuarios con rol cliente")

        if data.email:
            existing = await self.repo.get_by_email(data.email)
            if existing and existing.id != usuario_id:
                raise ConflictException("Email ya registrado")

        if data.dni:
            existing = await self.repo.get_by_dni(data.dni)
            if existing and existing.id != usuario_id:
                raise ConflictException("DNI ya registrado")

        updated = await self.repo.update(usuario_id, data)
        if not updated:
            raise NotFoundException("Usuario no encontrado")
        return updated

    async def enviar_aviso_masivo(self, mensaje: str) -> AvisoMasivoResponse:
        clientes = await self.repo.get_all_clientes()
        emails = [c.email for c in clientes]
        enviados = await EmailService().send_aviso_masivo(emails, mensaje)
        return AvisoMasivoResponse(enviados=enviados, total=len(emails))

    async def delete(self, usuario_id: uuid.UUID, current_usuario_id: uuid.UUID, current_user: Usuario | None = None) -> Usuario:
        if usuario_id == current_usuario_id:
            raise BadRequestException("No podés eliminar tu propio usuario")

        usuario = await self.repo.get_by_id(usuario_id)
        if not usuario:
            raise NotFoundException("Usuario no encontrado")

        if current_user and self._role_value(current_user.role) != UserRole.ADMIN.value:
            if self._role_value(usuario.role) != UserRole.CLIENTE.value:
                raise ForbiddenException("No autorizado para esta accion")

        now = datetime.now(LOCAL_TZ)
        released_slots = await self.repo.cancel_pending_class_reservations(
            usuario_id,
            now.date(),
            now.time(),
        )
        waitlist_service = WaitlistService(self.db)
        for clase_template_id, fecha in released_slots:
            await waitlist_service.trigger_promotion_for_slot(clase_template_id, fecha)

        usuario = await self.repo.delete(usuario_id)
        if not usuario:
            raise NotFoundException("Usuario no encontrado")
        return usuario

    @staticmethod
    def _role_value(role: str | UserRole) -> str:
        return role.value if hasattr(role, "value") else str(role)
