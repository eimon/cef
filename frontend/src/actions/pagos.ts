"use server";

import { serverApi } from "@/lib/server-api";
import { MiPago, RenovacionSuscripcionPendiente } from "@/types/api";

export type PreferenciaResult = {
    init_point?: string;
    preference_id?: string;
    error?: string;
};

export type ConfirmarPagoResult = {
    status?: string;
    already_processed?: boolean;
    error?: string;
};

export async function getMisPagos(): Promise<MiPago[]> {
    try {
        const res = await serverApi("/pagos/mios");
        if (!res.ok) return [];
        return res.json();
    } catch {
        return [];
    }
}

export async function getRenovacionesPendientes(): Promise<RenovacionSuscripcionPendiente[]> {
    try {
        const res = await serverApi("/pagos/renovaciones-pendientes");
        if (!res.ok) return [];
        return res.json();
    } catch {
        return [];
    }
}

export async function crearPreferenciaMP(
    claseTemplateId: string,
    fecha: string,
    monto: number,
): Promise<PreferenciaResult> {
    try {
        const res = await serverApi("/pagos/mp/preferencia", {
            method: "POST",
            params: {
                clase_template_id: claseTemplateId,
                fecha,
                monto: monto.toString(),
            },
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            return { error: error.detail || "Error al iniciar el pago con MercadoPago" };
        }
        return res.json();
    } catch {
        return { error: "Error al conectar con el servidor" };
    }
}

export async function crearPreferenciaSuscripcionMP(
    claseTemplateId: string,
    monto: number,
): Promise<PreferenciaResult> {
    try {
        const res = await serverApi("/pagos/mp/preferencia-suscripcion", {
            method: "POST",
            params: { clase_template_id: claseTemplateId, monto: monto.toString() },
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            return { error: error.detail || "Error al iniciar el pago de suscripción" };
        }
        return res.json();
    } catch {
        return { error: "Error al conectar con el servidor" };
    }
}

export async function crearPreferenciaRenovacionSuscripcionMP(
    suscripcionId: string,
): Promise<PreferenciaResult> {
    try {
        const res = await serverApi("/pagos/mp/preferencia-renovacion-suscripcion", {
            method: "POST",
            params: { suscripcion_id: suscripcionId },
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            return { error: error.detail || "Error al iniciar la renovación" };
        }
        return res.json();
    } catch {
        return { error: "Error al conectar con el servidor" };
    }
}

export async function crearPreferenciaDeudaMP(asistenciaId: string): Promise<PreferenciaResult> {
    try {
        const res = await serverApi("/pagos/mp/preferencia-deuda", {
            method: "POST",
            params: { asistencia_id: asistenciaId },
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            return { error: error.detail || "Error al iniciar el pago pendiente" };
        }
        return res.json();
    } catch {
        return { error: "Error al conectar con el servidor" };
    }
}

export async function confirmarDeudaMP(paymentId: string): Promise<ConfirmarPagoResult> {
    try {
        const res = await serverApi("/pagos/mp/confirmar-deuda", {
            method: "POST",
            params: { payment_id: paymentId },
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            return { error: error.detail || "Error al confirmar el pago pendiente" };
        }
        return res.json();
    } catch {
        return { error: "Error al conectar con el servidor" };
    }
}

export async function confirmarSuscripcionMP(paymentId: string): Promise<ConfirmarPagoResult> {
    try {
        const res = await serverApi("/pagos/mp/confirmar-suscripcion", {
            method: "POST",
            params: { payment_id: paymentId },
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            return { error: error.detail || "Error al confirmar la suscripción" };
        }
        return res.json();
    } catch {
        return { error: "Error al conectar con el servidor" };
    }
}

export async function confirmarRenovacionSuscripcionMP(paymentId: string): Promise<ConfirmarPagoResult> {
    try {
        const res = await serverApi("/pagos/mp/confirmar-renovacion-suscripcion", {
            method: "POST",
            params: { payment_id: paymentId },
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            return { error: error.detail || "Error al confirmar la renovación" };
        }
        return res.json();
    } catch {
        return { error: "Error al conectar con el servidor" };
    }
}

export async function confirmarPagoMP(paymentId: string): Promise<ConfirmarPagoResult> {
    try {
        const res = await serverApi("/pagos/mp/confirmar", {
            method: "POST",
            params: { payment_id: paymentId },
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            return { error: error.detail || "Error al confirmar el pago" };
        }
        return res.json();
    } catch {
        return { error: "Error al conectar con el servidor" };
    }
}
