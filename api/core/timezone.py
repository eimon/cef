from zoneinfo import ZoneInfo
from core.config import settings

LOCAL_TZ = ZoneInfo(settings.TIMEZONE)
