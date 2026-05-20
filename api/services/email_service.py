import logging

from core.config import settings
from exceptions.general import BadRequestException

logger = logging.getLogger(__name__)


class EmailService:
    async def send_verification_email(self, to_email: str, token: str) -> None:
        verification_url = f"{settings.FRONTEND_PUBLIC_URL.rstrip('/')}/auth/verify-email?token={token}"

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
