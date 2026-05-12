export enum UserRole {
    ADMIN = "admin",
    RECEPCION = "recepcion",
    CLIENTE = "cliente",
}

export interface User {
    id: string;
    email: string;
    telefono: string | null;
    nombre: string | null;
    apellido: string | null;
    fecha_nacimiento: string | null;
    dni: string | null;
    role: string | UserRole;
    activo: boolean;
    created_at: string;
}
export interface AuthResponse {
    access_token: string;
    token_type: string;
}