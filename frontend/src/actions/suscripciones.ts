"use server";

import { revalidatePath } from "next/cache";
import { serverApi } from "@/lib/server-api";
import { SuscripcionCheckResponse, SuscripcionResponse } from "@/types/api";

export type SuscripcionCheckState = {
    error?: string;
    success?: boolean;
    data?: SuscripcionCheckResponse;
};

export type SuscripcionState = {
    error?: string;
    success?: boolean;
    data?: SuscripcionResponse;
};

export async function checkElegibilidadSuscripcion(
    claseTemplateId: string,
): Promise<SuscripcionCheckState> {
    const res = await serverApi("/suscripciones/check", {
        params: { clase_template_id: claseTemplateId },
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return { error: errorData.detail || "No podés suscribirte a esta clase" };
    }

    const data: SuscripcionCheckResponse = await res.json();
    return { success: true, data };
}

export async function suscribirse(
    claseTemplateId: string,
    monto: number,
): Promise<SuscripcionState> {
    const res = await serverApi("/suscripciones/", {
        method: "POST",
        body: JSON.stringify({ clase_template_id: claseTemplateId, monto }),
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return { error: errorData.detail || "No se pudo completar la suscripción" };
    }

    const data: SuscripcionResponse = await res.json();
    revalidatePath("/clases");
    revalidatePath("/mis-clases");
    return { success: true, data };
}
