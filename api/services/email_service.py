import logging
from datetime import datetime
from html import escape

from core.config import settings
from exceptions.general import BadRequestException

logger = logging.getLogger(__name__)


def _https_url(base: str) -> str:
    return base.rstrip("/").replace("http://", "https://", 1)


class EmailService:
    async def send_waitlist_slot_available(
        self,
        to_email: str,
        clase_nombre: str,
        fecha: str,
        expira_at: datetime,
        waitlist_id: str,
        nombre: str | None = None,
    ) -> None:
        if not settings.RESEND_API_KEY:
            logger.warning("RESEND_API_KEY no configurada. No se envió aviso de lista de espera a %s", to_email)
            return
        try:
            import resend
        except ImportError:
            logger.warning("Paquete resend no instalado. No se envió aviso de lista de espera.")
            return

        frontend_url = _https_url(settings.FRONTEND_PUBLIC_URL)
        mis_clases_url = f"{frontend_url}/mis-clases?waitlist={waitlist_id}"
        saludo = f"Hola {escape(nombre)}," if nombre else "Hola,"
        clase_segura = escape(clase_nombre)
        fecha_segura = escape(fecha)
        vence_str = expira_at.strftime("%d/%m %H:%M")

        resend.api_key = settings.RESEND_API_KEY
        params: resend.Emails.SendParams = {
            "from": settings.RESEND_FROM_EMAIL,
            "to": [to_email],
            "subject": f"Se liberó un cupo para {clase_segura}",
            "html": (
                f"<p>{saludo}</p>"
                f"<p>Se liberó un cupo para <strong>{clase_segura}</strong> ({fecha_segura}).</p>"
                f"<p>Tenés tiempo hasta <strong>{vence_str}</strong> para confirmar y pagar tu lugar.</p>"
                f'<p>Ingresá a <a href="{mis_clases_url}">Mis Clases</a> para continuar.</p>'
            ),
        }

        try:
            resend.Emails.send(params)
        except Exception:
            logger.exception("Error enviando aviso de cupo liberado a %s", to_email)

    async def send_staff_credentials(
        self,
        to_email: str,
        password: str,
        nombre: str | None = None,
    ) -> None:
        login_url = f"{_https_url(settings.FRONTEND_PUBLIC_URL)}/auth/login"

        if not settings.RESEND_API_KEY:
            logger.warning("RESEND_API_KEY no configurada. No se envio la contrasena a %s", to_email)
            raise BadRequestException("No esta configurado el envio de emails")

        try:
            import resend
        except ImportError:
            logger.exception("Paquete resend no instalado")
            raise BadRequestException("No esta disponible el servicio de emails")

        safe_email = escape(to_email)
        safe_password = escape(password)
        safe_nombre = escape(nombre) if nombre else None
        greeting = f"Hola {safe_nombre}," if safe_nombre else "Hola,"

        resend.api_key = settings.RESEND_API_KEY
        params: resend.Emails.SendParams = {
            "from": settings.RESEND_FROM_EMAIL,
            "to": [to_email],
            "subject": "Acceso al sistema CEF",
            "html": (
                f"<p>{greeting}</p>"
                "<p>Se creo tu usuario de personal en CEF.</p>"
                f"<p>Email: <strong>{safe_email}</strong></p>"
                f"<p>Contrasena: <strong>{safe_password}</strong></p>"
                f'<p>Podes ingresar desde <a href="{login_url}">este enlace</a>.</p>'
                "<p>Por seguridad, te recomendamos cambiar la contrasena despues de iniciar sesion.</p>"
            ),
        }

        try:
            resend.Emails.send(params)
        except Exception as exc:
            logger.exception("Error enviando credenciales de personal con Resend")
            error_message = str(exc)
            if "API key is invalid" in error_message:
                raise BadRequestException("La API key de Resend es invalida") from exc
            if "You can only send testing emails" in error_message:
                raise BadRequestException(
                    "El remitente de prueba de Resend solo puede enviar al email de la cuenta"
                ) from exc
            if "domain" in error_message.lower() and "verify" in error_message.lower():
                raise BadRequestException("El dominio remitente de Resend no esta verificado") from exc
            raise BadRequestException("No pudimos enviar el email con la contrasena") from exc

    async def send_verification_email(self, to_email: str, token: str) -> None:
        verification_url = f"{_https_url(settings.FRONTEND_PUBLIC_URL)}/auth/verify-email?token={token}"

        if not settings.RESEND_API_KEY:
            logger.warning("RESEND_API_KEY no configurada. Link de verificacion: %s", verification_url)
            raise BadRequestException("No esta configurado el envio de emails")

        try:
            import resend
        except ImportError:
            logger.exception("Paquete resend no instalado")
            raise BadRequestException("No esta disponible el servicio de emails")

        resend.api_key = settings.RESEND_API_KEY
        params: resend.Emails.SendParams = {
            "from": settings.RESEND_FROM_EMAIL,
            "to": [to_email],
            "subject": "Confirmacion de cuenta CEF",
            "html": (
                "<p>Hola,</p>"
                "<p>Para confirmar tu cuenta en CEF, abri este enlace:</p>"
                f'<p><a href="{verification_url}">Confirmar mi email</a></p>'
                "<p>Si no solicitaste esta cuenta, podes ignorar este mensaje.</p>"
            ),
        }
        try:
            resend.Emails.send(params)
        except Exception as exc:
            logger.exception("Error enviando email de verificacion con Resend")
            error_message = str(exc)
            if "API key is invalid" in error_message:
                raise BadRequestException("La API key de Resend es invalida") from exc
            if "You can only send testing emails" in error_message:
                raise BadRequestException(
                    "El remitente de prueba de Resend solo puede enviar al email de la cuenta"
                ) from exc
            if "domain" in error_message.lower() and "verify" in error_message.lower():
                raise BadRequestException("El dominio remitente de Resend no esta verificado") from exc
            raise BadRequestException("No pudimos enviar el email de confirmacion") from exc

    async def send_email_change_verification(self, to_email: str, token: str) -> None:
        verification_url = f"{_https_url(settings.FRONTEND_PUBLIC_URL)}/auth/confirm-email?token={token}"

        if not settings.RESEND_API_KEY:
            logger.warning("RESEND_API_KEY no configurada. Link de confirmación: %s", verification_url)
            raise BadRequestException("No esta configurado el envio de emails")

        try:
            import resend
        except ImportError:
            logger.exception("Paquete resend no instalado")
            raise BadRequestException("No esta disponible el servicio de emails")

        resend.api_key = settings.RESEND_API_KEY
        params: resend.Emails.SendParams = {
            "from": settings.RESEND_FROM_EMAIL,
            "to": [to_email],
            "subject": "Confirmacion de cambio de email CEF",
            "html": (
                "<p>Hola,</p>"
                "<p>Pulsa el siguiente enlace para confirmar tu nuevo email en CEF:</p>"
                f'<p><a href="{verification_url}">Confirmar nuevo email</a></p>'
                "<p>Si no solicitaste este cambio, podes ignorar este mensaje.</p>"
            ),
        }

        try:
            resend.Emails.send(params)
        except Exception as exc:
            logger.exception("Error enviando email de cambio de email con Resend")
            error_message = str(exc)
            if "API key is invalid" in error_message:
                raise BadRequestException("La API key de Resend es invalida") from exc
            if "You can only send testing emails" in error_message:
                raise BadRequestException(
                    "El remitente de prueba de Resend solo puede enviar al email de la cuenta"
                ) from exc
            if "domain" in error_message.lower() and "verify" in error_message.lower():
                raise BadRequestException("El dominio remitente de Resend no esta verificado") from exc
            raise BadRequestException("No pudimos enviar el email de confirmacion") from exc

    async def send_clase_update_notification(self, emails: list[str], clase_nombre: str, dia_semana: str, hora_inicio: str, hora_fin: str) -> None:
        if not emails:
            return
        if not settings.RESEND_API_KEY:
            logger.warning("RESEND_API_KEY no configurada. No se enviaron notificaciones de cambio de clase.")
            return
        try:
            import resend
        except ImportError:
            logger.warning("Paquete resend no instalado. No se enviaron notificaciones.")
            return

        resend.api_key = settings.RESEND_API_KEY
        for email in emails:
            try:
                params: resend.Emails.SendParams = {
                    "from": settings.RESEND_FROM_EMAIL,
                    "to": [email],
                    "subject": f"Cambio en la clase {clase_nombre} - CEF",
                    "html": (
                        f"<p>Hola,</p>"
                        f"<p>Te informamos que la clase <strong>{clase_nombre}</strong> a la que estás inscripto ha sido modificada.</p>"
                        f"<p>Nuevo horario: <strong>{dia_semana} {hora_inicio} – {hora_fin}</strong></p>"
                        f"<p>Si tenés dudas, comunicate con recepción.</p>"
                    ),
                }
                resend.Emails.send(params)
            except Exception:
                logger.exception("Error enviando notificación de cambio de clase a %s", email)

    async def send_aviso_masivo(self, emails: list[str], mensaje: str) -> int:
        if not emails:
            return 0
        if not settings.RESEND_API_KEY:
            logger.warning("RESEND_API_KEY no configurada. No se enviaron avisos masivos.")
            return 0
        try:
            import resend
        except ImportError:
            logger.warning("Paquete resend no instalado. No se enviaron avisos masivos.")
            return 0

        resend.api_key = settings.RESEND_API_KEY
        enviados = 0
        for email in emails:
            try:
                params: resend.Emails.SendParams = {
                    "from": settings.RESEND_FROM_EMAIL,
                    "to": [email],
                    "subject": "Aviso de CEF",
                    "html": (
                        "<p>Hola,</p>"
                        f"<p>{mensaje}</p>"
                        "<p>Saludos,<br>El equipo de CEF</p>"
                    ),
                }
                resend.Emails.send(params)
                enviados += 1
            except Exception:
                logger.exception("Error enviando aviso masivo a %s", email)
        return enviados

    async def send_aviso_vencimiento_suscripcion(
        self,
        to_email: str,
        nombre: str | None,
        clase_nombre: str,
        fecha_vencimiento: str,
    ) -> None:
        if not settings.RESEND_API_KEY:
            logger.warning("RESEND_API_KEY no configurada. No se envió aviso de vencimiento a %s", to_email)
            return
        try:
            import resend
        except ImportError:
            logger.warning("Paquete resend no instalado. No se envió aviso de vencimiento.")
            return

        greeting = f"Hola {escape(nombre)}," if nombre else "Hola,"
        resend.api_key = settings.RESEND_API_KEY
        params: resend.Emails.SendParams = {
            "from": settings.RESEND_FROM_EMAIL,
            "to": [to_email],
            "subject": f"Tu suscripción a {escape(clase_nombre)} está por vencer — CEF",
            "html": (
                f"<p>{greeting}</p>"
                f"<p>Tu suscripción a <strong>{escape(clase_nombre)}</strong> vence el <strong>{escape(fecha_vencimiento)}</strong>.</p>"
                "<p>Para no perder tu lugar, renová antes de esa fecha.</p>"
                "<p>Saludos,<br>El equipo de CEF</p>"
            ),
        }
        try:
            resend.Emails.send(params)
        except Exception:
            logger.exception("Error enviando aviso de vencimiento a %s", to_email)

    async def send_password_reset(self, to_email: str, token: str) -> None:
        verification_url = f"{_https_url(settings.FRONTEND_PUBLIC_URL)}/auth/reset-password?token={token}"

        if not settings.RESEND_API_KEY:
            logger.warning("RESEND_API_KEY no configurada. Link de reseteo: %s", verification_url)
            raise BadRequestException("No esta configurado el envio de emails")

        try:
            import resend
        except ImportError:
            logger.exception("Paquete resend no instalado")
            raise BadRequestException("No esta disponible el servicio de emails")

        resend.api_key = settings.RESEND_API_KEY
        params: resend.Emails.SendParams = {
            "from": settings.RESEND_FROM_EMAIL,
            "to": [to_email],
            "subject": "Reseteo de contraseña CEF",
            "html": (
                "<p>Hola,</p>"
                "<p>Pulsa el siguiente enlace para cambiar tu contraseña en CEF:</p>"
                f'<p><a href="{verification_url}">Cambiar contraseña</a></p>'
                "<p>Este enlace vence a las 24 horas.</p>"
                "<p>Si no solicitaste este cambio, podes ignorar este mensaje.</p>"
            ),
        }

        try:
            resend.Emails.send(params)
        except Exception as exc:
            logger.exception("Error enviando email de reseteo con Resend")
            error_message = str(exc)
            if "API key is invalid" in error_message:
                raise BadRequestException("La API key de Resend es invalida") from exc
            if "You can only send testing emails" in error_message:
                raise BadRequestException(
                    "El remitente de prueba de Resend solo puede enviar al email de la cuenta"
                ) from exc
            if "domain" in error_message.lower() and "verify" in error_message.lower():
                raise BadRequestException("El dominio remitente de Resend no esta verificado") from exc
            raise BadRequestException("No pudimos enviar el email de confirmacion") from exc
