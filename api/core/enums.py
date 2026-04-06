import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    RECEPTION = "reception"
    CLIENT = "client"