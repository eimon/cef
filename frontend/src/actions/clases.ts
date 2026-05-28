"use server";

import { z } from "zod";
import { serverApi } from "@/lib/server-api";
import { ClaseTemplate, ClaseSemana } from "@/types/api";
import { revalidatePath } from "next/cache";

export type ClaseFormState = {
    error?: string;
    success?: boolean;
};

const claseBaseSchema = z.object({
    disciplina: z.string().min(1, "La disciplina es requerida"),
    dia_semana: z.string().min(1, "El día es requerido"),
    hora_inicio: z.string().min(1, "La hora de inicio es requerida"),
    hora_fin: z.string().min(1, "La hora de fin es requerida"),
    sala_id: z.string().uuid("Sala inválida"),
    profesor_id: z.string().uuid("Profesor inválido"),
    capacidad_maxima: z.coerce.number().int().min(1, "El cupo debe ser al menos 1"),
});

export async function createClase(
    prevState: ClaseFormState,
    formData: FormData
): Promise<ClaseFormState> {
    const validated = claseBaseSchema.safeParse({
        disciplina: formData.get("disciplina"),
        dia_semana: formData.get("dia_semana"),
        hora_inicio: formData.get("hora_inicio"),
        hora_fin: formData.get("hora_fin"),
        sala_id: formData.get("sala_id"),
        profesor_id: formData.get("profesor_id"),
        capacidad_maxima: formData.get("capacidad_maxima"),
    });

    if (!validated.success) {
        return { error: validated.error.issues[0].message };
    }

    try {
        const res = await serverApi("/clases/", {
            method: "POST",
            body: JSON.stringify(validated.data),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return { error: errorData.detail || "Error al crear la clase" };
        }
    } catch (error) {
        console.error("Create Clase Error:", error);
        return { error: "Something went wrong" };
    }

    revalidatePath("/clases");
    return { success: true };
}

export async function updateClase(
    claseId: string,
    prevState: ClaseFormState,
    formData: FormData
): Promise<ClaseFormState> {
    const validated = claseBaseSchema.safeParse({
        disciplina: formData.get("disciplina"),
        dia_semana: formData.get("dia_semana"),
        hora_inicio: formData.get("hora_inicio"),
        hora_fin: formData.get("hora_fin"),
        sala_id: formData.get("sala_id"),
        profesor_id: formData.get("profesor_id"),
        capacidad_maxima: formData.get("capacidad_maxima"),
    });

    if (!validated.success) {
        return { error: validated.error.issues[0].message };
    }

    try {
        const res = await serverApi(`/clases/${claseId}`, {
            method: "PUT",
            body: JSON.stringify(validated.data),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return { error: errorData.detail || "Error al editar la clase" };
        }
    } catch (error) {
        console.error("Update Clase Error:", error);
        return { error: "Something went wrong" };
    }

    revalidatePath("/clases");
    return { success: true };
}

export async function deleteClase(
    claseId: string
): Promise<{ success?: boolean; error?: string }> {
    try {
        const res = await serverApi(`/clases/${claseId}`, { method: "DELETE" });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return { error: errorData.detail || "Error al eliminar la clase" };
        }
    } catch (error) {
        console.error("Delete Clase Error:", error);
        return { error: "Something went wrong" };
    }
    revalidatePath("/clases");
    return { success: true };
}

export async function getClases(): Promise<ClaseTemplate[]> {
    try {
        const res = await serverApi("/clases/");
        if (!res.ok) return [];
        return res.json();
    } catch (error) {
        console.error("Get Clases Error:", error);
        return [];
    }
}

export async function getClase(claseId: string): Promise<ClaseTemplate | null> {
    try {
        const res = await serverApi(`/clases/${claseId}`);
        if (!res.ok) return null;
        return res.json();
    } catch (error) {
        console.error("Get Clase Error:", error);
        return null;
    }
}

export async function getClasesSemana(fecha: string): Promise<ClaseSemana[]> {
    try {
        const res = await serverApi("/clases/semana", { params: { fecha } });
        if (!res.ok) return [];
        return res.json();
    } catch (error) {
        console.error("Get Clases Semana Error:", error);
        return [];
    }
}
