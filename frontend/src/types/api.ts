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
    genero: string | null;
    role: string | UserRole;
    activo: boolean;
    created_at: string;
}
export interface Profesor {
    id: string;
    dni: string;
    nombre: string;
    apellido: string;
    genero: string | null;
    email: string | null;
    telefono: string | null;
    activo: boolean;
    created_at: string;
    updated_at: string | null;
}

export type MedicalRecordBody = {
    contacto_emergencia?: {
        nombre?: string;
        relacion?: string;
        telefono?: string;
    };
    antecedentes_medicos?: {
        afecciones?: string[];
        especifique_otros?: string;
    };
    informacion_adicional_salud?: {
        fuma_o_ha_fumado?: string;
        consume_alcohol?: string;
        mareos_falta_aire_o_dolor_pecho?: string;
        horas_sueno_promedio?: string;
        dificultad_para_dormir?: string;
        dieta_especial_o_suplementacion?: string;
    };
    historial_cirugias?: Array<{
        descripcion?: string;
        fecha?: string;
        complicaciones_secuelas?: string;
    }>;
    alergias_y_medicacion?: {
        alergias?: string;
        medicacion_actual?: string;
    };
    actividad_fisica_y_objetivos?: {
        realiza_actividad_fisica_actualmente?: string;
        frecuencia?: string;
        objetivo_principal?: string[];
    };
    consentimiento_y_declaracion_jurada?: {
        aceptado?: boolean;
        texto?: string;
    };
};

export interface MedicalRecordProfile {
    id: string;
    fecha: string;
    cuerpo_ficha: MedicalRecordBody;
    created_at: string;
    updated_at: string | null;
}

export interface Sala {
    id: string;
    nombre: string;
    capacidad: number | null;
    activo: boolean;
    created_at: string;
    updated_at: string | null;
}

export interface AuthResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
}

export enum Disciplina {
    YOGA = "yoga",
    PILATES = "pilates",
    FUNCIONAL = "funcional",
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
    disciplina: Disciplina;
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

export interface InstanciaSemana {
    id: string;
    fecha: string;
    cancelada: boolean;
    cupo: number;
}

export interface InscripcionResponse {
    asistencia_id: string;
    pago_id: string;
    monto: number;
    clase_instancia_id: string;
}

export enum EstadoPago {
    PENDIENTE = "pendiente",
    PAGADO = "pagado",
    ANULADO = "anulado",
}

export interface MiClaseIndividual {
    asistencia_id: string;
    clase_nombre: string;
    disciplina: Disciplina;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    profesor_nombre: string | null;
    sala_nombre: string | null;
    monto_pagado: number | null;
    estado_pago: EstadoPago | null;
    asistio: boolean;
    cancelo: boolean;
}

export interface InstanciaEnSuscripcion {
    instancia_id: string;
    fecha: string;
    cancelada: boolean;
}

export interface MiSuscripcion {
    id: string;
    clase_template_id: string;
    clase_nombre: string;
    disciplina: Disciplina;
    dia_semana: DiaSemana;
    hora_inicio: string;
    hora_fin: string;
    profesor_nombre: string | null;
    sala_nombre: string | null;
    fecha_inicio: string;
    fecha_fin: string;
    monto: number;
    activo: boolean;
    instancias: InstanciaEnSuscripcion[];
}

export interface SuscripcionCheckResponse {
    elegible: boolean;
    fecha_inicio: string;
    fecha_fin: string;
    fechas_clases: string[];
    precio_total: number;
    monto_minimo: number;
}

export interface SuscripcionResponse {
    id: string;
    clase_template_id: string;
    pago_id: string;
    monto: number;
    fecha_inicio: string;
    fecha_fin: string;
    fechas_clases: string[];
    activo: boolean;
}

export interface ClaseSemana {
    id: string;
    nombre: string;
    descripcion: string | null;
    disciplina: Disciplina;
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
    fecha_en_semana: string;
    cupo_disponible: number;
    instancia: InstanciaSemana | null;
}
