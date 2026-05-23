"use server";

import { serverApi } from "@/lib/server-api";

export type SenaMinimaFormState = {
    error?: string;
    success?: boolean;
};

export async function getSenaMinima(): Promise<string> {
    try {
        const res = await serverApi("/config/sena-minima");
        if (!res.ok) return "0";
        const data = await res.json();
        return data.valor ?? "0";
    } catch {
        return "0";
    }
}

export async function updateSenaMinima(
    prevState: SenaMinimaFormState,
    formData: FormData
): Promise<SenaMinimaFormState> {
    const valor = (formData.get("valor") as string)?.trim() ?? "";

    if (!valor) {
        return {
            error: "El precio debe ser un valor mayor a cero",
        };
    }

    try {
        const res = await serverApi("/config/sena-minima", {
            method: "PUT",
            body: JSON.stringify({ valor }),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return { error: errorData.detail || "Error al actualizar el monto" };
        }
    } catch {
        return {
            error: "El precio debe ser un valor mayor a cero",
        };
    }

    return { success: true };
}
