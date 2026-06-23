"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { EstadoLicencia, Licencia, TipoLicencia } from "@/types/api";
import { serverApi } from "@/lib/server-api";

const createLicenciaSchema = z.object({
    profesor_id: z.string().uuid("Profesor inválido"),
    fecha_inicio: z.string().min(1, "La fecha de inicio es requerida"),
    fecha_fin: z.string().min(1, "La fecha de fin es requerida"),
    tipo: z.nativeEnum(TipoLicencia),
    motivo: z.string().max(500, "El motivo no puede superar 500 caracteres").optional(),
    profesor_reemplazo_id: z.string().uuid("Profesor reemplazo inválido").optional(),
});

const updateLicenciaSchema = z.object({
    fecha_inicio: z.string().min(1, "La fecha de inicio es requerida").optional(),
    fecha_fin: z.string().min(1, "La fecha de fin es requerida").optional(),
    tipo: z.nativeEnum(TipoLicencia).optional(),
    motivo: z.string().max(500, "El motivo no puede superar 500 caracteres").optional(),
    profesor_reemplazo_id: z.string().uuid("Profesor reemplazo inválido").optional(),
});

const decisionSchema = z.object({
    notas_admin: z.string().max(500, "Las notas no pueden superar 500 caracteres").optional(),
    profesor_reemplazo_id: z.string().uuid("Profesor reemplazo inválido").optional(),
});

export type LicenciaFormState = {
    error?: string;
    success?: boolean;
};

export type GetLicenciasParams = {
    profesor_id?: string;
    estado?: EstadoLicencia;
    fecha_desde?: string;
    fecha_hasta?: string;
};

export async function getLicencias(params: GetLicenciasParams = {}): Promise<Licencia[]> {
    try {
        const searchParams = new URLSearchParams();
        if (params.profesor_id?.trim()) searchParams.append("profesor_id", params.profesor_id.trim());
        if (params.estado) searchParams.append("estado", params.estado);
        if (params.fecha_desde?.trim()) searchParams.append("fecha_desde", params.fecha_desde.trim());
        if (params.fecha_hasta?.trim()) searchParams.append("fecha_hasta", params.fecha_hasta.trim());

        const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
        const res = await serverApi(`/licencias/${query}`);
        if (!res.ok) return [];
        return res.json();
    } catch (error) {
        console.error("Get Licencias Error:", error);
        return [];
    }
}

export async function createLicencia(
    prevState: LicenciaFormState,
    formData: FormData
): Promise<LicenciaFormState> {
    const validatedFields = createLicenciaSchema.safeParse({
        profesor_id: formData.get("profesor_id"),
        fecha_inicio: formData.get("fecha_inicio"),
        fecha_fin: formData.get("fecha_fin"),
        tipo: formData.get("tipo"),
        motivo: formData.get("motivo") || undefined,
        profesor_reemplazo_id: formData.get("profesor_reemplazo_id") || undefined,
    });

    if (!validatedFields.success) {
        return { error: validatedFields.error.issues[0].message };
    }

    try {
        const res = await serverApi("/licencias/", {
            method: "POST",
            body: JSON.stringify(validatedFields.data),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return { error: errorData.detail || "Error al crear la licencia" };
        }
    } catch (error) {
        console.error("Create Licencia Error:", error);
        return { error: "Something went wrong" };
    }

    revalidatePath("/profesores");
    return { success: true };
}

export async function approveLicencia(
    licenciaId: string,
    payload: { notas_admin?: string; profesor_reemplazo_id?: string } = {}
): Promise<{ success?: boolean; error?: string }> {
    const validatedFields = decisionSchema.safeParse(payload);
    if (!validatedFields.success) {
        return { error: validatedFields.error.issues[0].message };
    }

    try {
        const res = await serverApi(`/licencias/${licenciaId}/aprobar`, {
            method: "POST",
            body: JSON.stringify(validatedFields.data),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return { error: errorData.detail || "Error al aprobar la licencia" };
        }
    } catch (error) {
        console.error("Approve Licencia Error:", error);
        return { error: "Something went wrong" };
    }

    revalidatePath("/profesores");
    return { success: true };
}

export async function updateLicencia(
    licenciaId: string,
    payload: {
        fecha_inicio?: string;
        fecha_fin?: string;
        tipo?: TipoLicencia;
        motivo?: string;
        profesor_reemplazo_id?: string;
    }
): Promise<{ success?: boolean; error?: string }> {
    const validatedFields = updateLicenciaSchema.safeParse(payload);
    if (!validatedFields.success) {
        return { error: validatedFields.error.issues[0].message };
    }

    try {
        const res = await serverApi(`/licencias/${licenciaId}`, {
            method: "PUT",
            body: JSON.stringify(validatedFields.data),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return { error: errorData.detail || "Error al actualizar la licencia" };
        }
    } catch (error) {
        console.error("Update Licencia Error:", error);
        return { error: "Something went wrong" };
    }

    revalidatePath("/profesores");
    return { success: true };
}

export async function rejectLicencia(
    licenciaId: string,
    payload: { notas_admin?: string } = {}
): Promise<{ success?: boolean; error?: string }> {
    const validatedFields = decisionSchema.safeParse(payload);
    if (!validatedFields.success) {
        return { error: validatedFields.error.issues[0].message };
    }

    try {
        const res = await serverApi(`/licencias/${licenciaId}/rechazar`, {
            method: "POST",
            body: JSON.stringify(validatedFields.data),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return { error: errorData.detail || "Error al rechazar la licencia" };
        }
    } catch (error) {
        console.error("Reject Licencia Error:", error);
        return { error: "Something went wrong" };
    }

    revalidatePath("/profesores");
    return { success: true };
}

export async function deleteLicencia(licenciaId: string): Promise<{ success?: boolean; error?: string }> {
    try {
        const res = await serverApi(`/licencias/${licenciaId}`, {
            method: "DELETE",
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return { error: errorData.detail || "Error al eliminar la licencia" };
        }
    } catch (error) {
        console.error("Delete Licencia Error:", error);
        return { error: "Something went wrong" };
    }

    revalidatePath("/profesores");
    return { success: true };
}
