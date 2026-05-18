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

export enum DiaSemana {
    LUNES = "lunes",
    MARTES = "martes",
    MIERCOLES = "miercoles",
    JUEVES = "jueves",
    VIERNES = "viernes",
    SABADO = "sabado",
    DOMINGO = "domingo",
}

export interface ClaseTemplate {
    id: string;
    nombre: string;
    descripcion: string | null;
    dia_semana: DiaSemana;
    hora_inicio: string;
    hora_fin: string;
    capacidad_maxima: number;
    precio_individual: number;
    precio_suscripcion: number;
    profesor_id: string | null;
    sala_id: string | null;
    profesor_nombre: string | null;
    sala_nombre: string | null;
    activo: boolean;
    created_at: string;
    updated_at: string | null;
}