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
