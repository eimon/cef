"use server";

import { serverApi } from "@/lib/server-api";
import { InscripcionResponse } from "@/types/api";

export type InscripcionState = {
    error?: string;
    success?: boolean;
    data?: InscripcionResponse;
};

export async function checkElegibilidadIndividual(
    claseInstanciaId: string,
): Promise<InscripcionState> {
    const res = await serverApi("/inscripciones/individual/check", {
        params: { clase_instancia_id: claseInstanciaId },
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return { error: errorData.detail || "No podés inscribirte en esta clase" };
    }

    return { success: true };
}

export async function inscribirseIndividual(
    claseInstanciaId: string,
    monto: number,
): Promise<InscripcionState> {
    const res = await serverApi("/inscripciones/individual", {
        method: "POST",
        body: JSON.stringify({ clase_instancia_id: claseInstanciaId, monto }),
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return { error: errorData.detail || "No se pudo completar la inscripción" };
    }

    const data: InscripcionResponse = await res.json();
    return { success: true, data };
}
