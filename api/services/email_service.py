import logging

from core.config import settings
from exceptions.general import BadRequestException

logger = logging.getLogger(__name__)


def _https_url(base: str) -> str:
    return base.rstrip("/").replace("http://", "https://", 1)


class EmailService:
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
