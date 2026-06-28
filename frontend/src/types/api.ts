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

export interface UserRegistrationsPoint {
    period: string;
    total_count: number;
}

export interface UserRegistrationsReport {
    granularity: string;
    granularity_label: string;
    points: UserRegistrationsPoint[];
}

export interface ActiveUsersByActivityPoint {
    period: string;
    activity: string;
    total_count: number;
}

export interface ActiveUsersByActivityReport {
    granularity: string;
    granularity_label: string;
    points: ActiveUsersByActivityPoint[];
}

export interface BillingReportPoint {
    period: string;
    total_revenue: number;
}

export interface BillingReport {
    granularity: string;
    granularity_label: string;
    total_revenue: number;
    message: string | null;
    points: BillingReportPoint[];
}

export interface ReportClassOption {
    id: string;
    nombre: string;
    disciplina: string;
    dia_semana: string;
    hora_inicio: string;
    hora_fin: string;
}

export interface ClassCancellationsPoint {
    period: string;
    total_count: number;
}

export interface ClassCancellationsReport {
    granularity: string;
    granularity_label: string;
    clase: ReportClassOption;
    points: ClassCancellationsPoint[];
}

export interface ClassCancellationRankingItem {
    clase: ReportClassOption;
    total_count: number;
}

export interface ClassCancellationsRankingReport {
    start_date: string;
    end_date: string;
    total_count: number;
    items: ClassCancellationRankingItem[];
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
    disponible: boolean;
    licencia_activa: {
        tipo: TipoLicencia;
        motivo: string | null;
        fecha_fin: string;
    } | null;
    motivo_inactividad: string | null;
    disciplinas: string[];
    created_at: string;
    updated_at: string | null;
}

export enum TipoLicencia {
    VACACIONES = "vacaciones",
    ENFERMEDAD = "enfermedad",
    PERSONAL = "personal",
    ESTUDIO = "estudio",
    OTRO = "otro",
}

export enum EstadoLicencia {
    PENDIENTE = "pendiente",
    APROBADA = "aprobada",
    RECHAZADA = "rechazada",
}

export interface Licencia {
    id: string;
    profesor_id: string;
    profesor_reemplazo_id: string | null;
    fecha_inicio: string;
    fecha_fin: string;
    tipo: TipoLicencia;
    estado: EstadoLicencia;
    motivo: string | null;
    notas_admin: string | null;
    resuelto_por_id: string | null;
    resuelto_at: string | null;
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
    capacidad: number;
    activo: boolean;
    created_at: string;
    updated_at: string | null;
}

export interface AuthResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
}

export type Disciplina = string;

export interface DisciplinaItem {
    id: string;
    nombre: string;
    precio_individual: number;
    precio_suscripcion: number;
    activo: boolean;
    created_at: string;
    updated_at: string | null;
}

export interface PrecioDisciplina {
    disciplina: Disciplina;
    precio_individual: number;
    precio_suscripcion: number;
    updated_at: string;
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

export enum EstadoWaitlist {
    EN_ESPERA = "en_espera",
    NOTIFICADO = "notificado",
    CONFIRMADO_PAGADO = "confirmado_pagado",
    EXPIRADO = "expirado",
    CANCELADO = "cancelado",
}

export interface WaitlistJoinResponse {
    waitlist_id: string;
    posicion: number;
    estado: EstadoWaitlist;
    clase_template_id: string;
    fecha: string;
}

export interface WaitlistEntry {
    id: string;
    clase_template_id: string;
    clase_nombre: string;
    disciplina: Disciplina;
    fecha: string;
    posicion: number;
    estado: EstadoWaitlist;
    notificado_at: string | null;
    expira_at: string | null;
    created_at: string;
}

export enum EstadoPago {
    PENDIENTE = "pendiente",
    PAGADO = "pagado",
    ANULADO = "anulado",
}

export interface MiPago {
    id: string;
    monto: number;
    fecha_pago: string;
    estado: EstadoPago;
    mp_payment_id: string | null;
    descripcion: string | null;
    tipo: string;
    clase_nombre: string | null;
    disciplina: Disciplina | null;
    suscripcion_id: string | null;
}

export interface RenovacionSuscripcionPendiente {
    suscripcion_id: string;
    clase_template_id: string;
    clase_nombre: string;
    disciplina: Disciplina;
    fecha_inicio: string;
    fecha_fin: string;
    renovacion_disponible_desde: string;
    renovacion_disponible_hasta: string;
    nueva_fecha_inicio: string;
    nueva_fecha_fin: string;
    cantidad_clases: number;
    precio_total: number;
}

export interface PreviewRenovacion {
    precio_base: number;
    descuento_porcentaje: number;
    precio_total: number;
    clases_canceladas: number;
}

export interface DeudaPendiente {
    asistencia_id: string;
    clase_nombre: string;
    disciplina: Disciplina;
    fecha: string;
    hora_inicio: string;
    monto_pagado: number;
    precio_total: number;
    monto_restante: number;
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
    precio_clase: number | null;
    asistio: boolean;
    cancelo: boolean;
    deuda_vencida: boolean;
}

export interface InstanciaEnSuscripcion {
    instancia_id: string;
    fecha: string;
    cancelada: boolean;
    asistencia_id: string | null;
}

export interface RenovacionIniciada {
    siguiente_suscripcion_id: string;
    clase_nombre: string;
    fecha_inicio: string;
    fecha_fin: string;
    precio_total: number;
}

export interface CancelacionResult {
    reintegro: "none" | "mp" | "cupon";
    mensaje: string;
    monto_reintegrado?: number;
    descuento_porcentaje?: number;
    refund_error: boolean;
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
    estado: "vigente" | "renovable" | "vencida";
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
    fecha_pago: string;
    estado: "vigente" | "renovable" | "vencida";
    fechas_clases: string[];
    activo: boolean;
}

export enum TipoInscripcion {
    INDIVIDUAL = "individual",
    SUSCRIPCION = "suscripcion",
}

export interface AsistenciaRecepcion {
    asistencia_id: string;
    usuario_nombre: string;
    tipo: TipoInscripcion;
    asistio: boolean;
    cancelo: boolean;
}

export interface AsistenciaEscaneoItem {
    asistencia_id: string;
    clase_nombre: string;
    disciplina: string;
    hora_inicio: string;
    hora_fin: string;
    tipo: string;
    asistio: boolean;
    cancelo: boolean;
    puede_marcar: boolean;
    razon_no_puede: string | null;
}

export interface EscaneoQRResult {
    usuario_nombre: string;
    asistencias: AsistenciaEscaneoItem[];
}

export interface InstanciaHoy {
    instancia_id: string;
    clase_nombre: string;
    disciplina: string;
    hora_inicio: string;
    hora_fin: string;
    sala_nombre: string;
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
    cupo_suscripcion_disponible: boolean;
    waitlist_disponible: boolean;
    waitlist_total: number;
    instancia: InstanciaSemana | null;
    inscrito: boolean;
    suscrito: boolean;
}
