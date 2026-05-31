"use server";

import { serverApi } from "@/lib/server-api";

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
