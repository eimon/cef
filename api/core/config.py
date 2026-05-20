from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "CEF API"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 60

    # Database
    DATABASE_URL: str
    
    # iCalendar
    DOMAIN: str = "cef.com.ar"

    # Public registration email verification
    RESEND_API_KEY: Optional[str] = None
    RESEND_FROM_EMAIL: str = "CEF <onboarding@resend.dev>"
    FRONTEND_PUBLIC_URL: str = "http://localhost:3000"
    EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS: int = 24

    class Config:
        case_sensitive = True

settings = Settings()
