"use server";

import { serverApi } from "@/lib/server-api";

export type SenaMinimaFormState = {
    error?: string;
    success?: boolean;
    nuevoValor?: number;
};

export async function getSenaMinima(): Promise<string> {
    try {
        const res = await serverApi("/config/sena-minima");
        if (!res.ok) return "50";
        const data = await res.json();
        return data.valor ?? "50";
    } catch {
        return "50";
    }
}

export type DiasFormState = {
    error?: string;
    success?: boolean;
    nuevoValor?: number;
};

export async function getPlazoPago(): Promise<string> {
    try {
        const res = await serverApi("/config/plazo-pago");
        if (!res.ok) return "10";
        const data = await res.json();
        return data.valor ?? "10";
    } catch {
        return "10";
    }
}

export async function updatePlazoPago(
    prevState: DiasFormState,
    formData: FormData
): Promise<DiasFormState> {
    const valor = (formData.get("valor") as string)?.trim() ?? "";
    const dias = parseInt(valor, 10);
    if (!valor || isNaN(dias) || dias < 1 || dias > 90) {
        return { error: "El plazo debe ser entre 1 y 90 días" };
    }
    try {
        const res = await serverApi("/config/plazo-pago", {
            method: "PUT",
            body: JSON.stringify({ valor }),
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return { error: errorData.detail || "Error al actualizar el plazo" };
        }
    } catch {
        return { error: "El plazo debe ser entre 1 y 90 días" };
    }
    return { success: true, nuevoValor: dias };
}

export async function getDiasAvisoVencimiento(): Promise<string> {
    try {
        const res = await serverApi("/config/dias-aviso-vencimiento");
        if (!res.ok) return "1";
        const data = await res.json();
        return data.valor ?? "1";
    } catch {
        return "1";
    }
}

export async function updateDiasAvisoVencimiento(
    prevState: DiasFormState,
    formData: FormData
): Promise<DiasFormState> {
    const valor = (formData.get("valor") as string)?.trim() ?? "";
    const dias = parseInt(valor, 10);
    if (!valor || isNaN(dias) || dias < 1 || dias > 30) {
        return { error: "El aviso debe ser entre 1 y 30 días" };
    }
    try {
        const res = await serverApi("/config/dias-aviso-vencimiento", {
            method: "PUT",
            body: JSON.stringify({ valor }),
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return { error: errorData.detail || "Error al actualizar el aviso" };
        }
    } catch {
        return { error: "El aviso debe ser entre 1 y 30 días" };
    }
    return { success: true, nuevoValor: dias };
}

export async function updateSenaMinima(
    prevState: SenaMinimaFormState,
    formData: FormData
): Promise<SenaMinimaFormState> {
    const valor = (formData.get("valor") as string)?.trim() ?? "";
    const porcentaje = parseFloat(valor);

    if (!valor || isNaN(porcentaje) || porcentaje < 50 || porcentaje > 100) {
        return { error: "El porcentaje debe ser un valor entre 50 y 100" };
    }

    try {
        const res = await serverApi("/config/sena-minima", {
            method: "PUT",
            body: JSON.stringify({ valor }),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return { error: errorData.detail || "Error al actualizar el porcentaje" };
        }
    } catch {
        return { error: "El porcentaje debe ser un valor entre 50 y 100" };
    }

    return { success: true, nuevoValor: porcentaje };
}
