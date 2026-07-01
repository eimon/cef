"use server";

import { revalidatePath } from "next/cache";
import { serverApi } from "@/lib/server-api";
import { EstadoWaitlist, InscripcionResponse, WaitlistEntry, WaitlistJoinResponse } from "@/types/api";

export type InscripcionState = {
    error?: string;
    success?: boolean;
    data?: InscripcionResponse;
};

export type WaitlistState = {
    error?: string;
    success?: boolean;
    data?: WaitlistJoinResponse;
};

export type WaitlistStatus = {
    id: string;
    estado: EstadoWaitlist;
    posicion: number;
    expira_at: string | null;
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

export async function anotarseWaitlist(
    claseTemplateId: string,
    fecha: string,
): Promise<WaitlistState> {
    const res = await serverApi("/inscripciones/waitlist", {
        method: "POST",
        body: JSON.stringify({ clase_template_id: claseTemplateId, fecha }),
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return { error: errorData.detail || "No se pudo completar la inscripción en lista de espera" };
    }

    const data: WaitlistJoinResponse = await res.json();
    revalidatePath("/clases");
    revalidatePath("/mis-clases");
    return { success: true, data };
}

export async function getMisWaitlist(): Promise<WaitlistEntry[]> {
    try {
        const res = await serverApi("/inscripciones/waitlist/mias");
        if (!res.ok) return [];
        return res.json();
    } catch {
        return [];
    }
}

export async function cancelarWaitlist(
    waitlistId: string,
): Promise<{ success?: boolean; error?: string }> {
    try {
        const res = await serverApi(`/inscripciones/waitlist/${waitlistId}`, { method: "DELETE" });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { error: err.detail || "No se pudo cancelar la espera" };
        }
        revalidatePath("/clases");
        revalidatePath("/mis-clases");
        return { success: true };
    } catch {
        return { error: "Error de conexión al cancelar la espera" };
    }
}

export async function getWaitlistStatus(waitlistId: string): Promise<WaitlistStatus | null> {
    try {
        const res = await serverApi(`/inscripciones/waitlist/${waitlistId}/status`);
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

export async function anotarseWaitlistSuscripcion(
    claseTemplateId: string,
    fecha: string,
): Promise<WaitlistState> {
    const res = await serverApi("/inscripciones/waitlist-suscripcion", {
        method: "POST",
        body: JSON.stringify({ clase_template_id: claseTemplateId, fecha }),
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return { error: errorData.detail || "No se pudo completar la inscripción en lista de espera de suscripción" };
    }

    const data: WaitlistJoinResponse = await res.json();
    revalidatePath("/clases");
    revalidatePath("/mis-clases");
    return { success: true, data };
}

export async function getMisWaitlistSuscripcion(): Promise<WaitlistEntry[]> {
    try {
        const res = await serverApi("/inscripciones/waitlist-suscripcion/mias");
        if (!res.ok) return [];
        return res.json();
    } catch {
        return [];
    }
}

export async function cancelarWaitlistSuscripcion(
    waitlistId: string,
): Promise<{ success?: boolean; error?: string }> {
    try {
        const res = await serverApi(`/inscripciones/waitlist-suscripcion/${waitlistId}`, { method: "DELETE" });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { error: err.detail || "No se pudo cancelar la espera de suscripción" };
        }
        revalidatePath("/clases");
        revalidatePath("/mis-clases");
        return { success: true };
    } catch {
        return { error: "Error de conexión al cancelar la espera de suscripción" };
    }
}

export async function getWaitlistSuscripcionStatus(waitlistId: string): Promise<WaitlistStatus | null> {
    try {
        const res = await serverApi(`/inscripciones/waitlist-suscripcion/${waitlistId}/status`);
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}
