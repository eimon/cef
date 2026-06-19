"use server";

import { revalidatePath } from "next/cache";
import { serverApi } from "@/lib/server-api";
import { CancelacionResult, MiClaseIndividual, MiSuscripcion } from "@/types/api";

export async function getMisClasesIndividuales(): Promise<MiClaseIndividual[]> {
    try {
        const res = await serverApi("/mis-clases/individuales");
        if (!res.ok) return [];
        return res.json();
    } catch {
        return [];
    }
}

export async function getMisSuscripciones(): Promise<MiSuscripcion[]> {
    try {
        const res = await serverApi("/mis-clases/suscripciones");
        if (!res.ok) return [];
        return res.json();
    } catch {
        return [];
    }
}

export async function cancelarClase(
    asistenciaId: string
): Promise<{ data?: CancelacionResult; error?: string }> {
    try {
        const res = await serverApi(`/mis-clases/${asistenciaId}/cancelar`, { method: "POST" });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { error: err.detail || "Error al cancelar la clase" };
        }
        revalidatePath("/mis-clases");
        return { data: await res.json() };
    } catch {
        return { error: "Error de conexión al cancelar la clase" };
    }
}
