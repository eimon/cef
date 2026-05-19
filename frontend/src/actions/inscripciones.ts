"use server";

import { revalidatePath } from "next/cache";
import { serverApi } from "@/lib/server-api";
import { InscripcionResponse } from "@/types/api";

export type InscripcionState = {
    error?: string;
    success?: boolean;
    data?: InscripcionResponse;
};

export async function checkElegibilidadIndividual(
    claseTemplateId: string,
    fecha: string,
): Promise<InscripcionState> {
    const res = await serverApi("/inscripciones/individual/check", {
        params: { clase_template_id: claseTemplateId, fecha },
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return { error: errorData.detail || "No podés inscribirte en esta clase" };
    }

    return { success: true };
}

export async function inscribirseIndividual(
    claseTemplateId: string,
    fecha: string,
    monto: number,
): Promise<InscripcionState> {
    const res = await serverApi("/inscripciones/individual", {
        method: "POST",
        body: JSON.stringify({ clase_template_id: claseTemplateId, fecha, monto }),
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return { error: errorData.detail || "No se pudo completar la inscripción" };
    }

    const data: InscripcionResponse = await res.json();
    revalidatePath("/clases");
    revalidatePath("/mis-clases");
    return { success: true, data };
}
