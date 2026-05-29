"use server";

import { z } from "zod";
import { serverApi } from "@/lib/server-api";
import { ClaseTemplate, ClaseSemana } from "@/types/api";
import { revalidatePath } from "next/cache";

export type ClaseFormState = {
    error?: string;
    success?: boolean;
};

const invalidDateMessage = "Seleccione una fecha valida";

function getTodayIso(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function isValidFutureOrTodayDate(value: string): boolean {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;

    const [, year, month, day] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    const isValid =
        date.getFullYear() === Number(year) &&
        date.getMonth() === Number(month) - 1 &&
        date.getDate() === Number(day);

    return isValid && value >= getTodayIso();
}

const claseBaseSchema = z.object({
    disciplina: z.string().min(1, "La disciplina es requerida"),
    fecha: z.string().min(1, invalidDateMessage).refine(isValidFutureOrTodayDate, invalidDateMessage),
    hora_inicio: z.string().min(1, "La hora de inicio es requerida"),
    hora_fin: z.string().min(1, "La hora de fin es requerida"),
    sala_id: z.string().uuid("Sala inválida"),
    profesor_id: z.string().uuid("Profesor inválido"),
});

const createClaseSchema = claseBaseSchema.extend({
    precio_individual: z.coerce.number().gt(0, "El precio debe ser un valor mayor a cero"),
    precio_suscripcion: z.coerce.number().gt(0, "El precio debe ser un valor mayor a cero"),
});

export async function createClase(
    prevState: ClaseFormState,
    formData: FormData
): Promise<ClaseFormState> {
    const validated = createClaseSchema.safeParse({
        disciplina: formData.get("disciplina"),
        fecha: formData.get("fecha"),
        hora_inicio: formData.get("hora_inicio"),
        hora_fin: formData.get("hora_fin"),
        sala_id: formData.get("sala_id"),
        profesor_id: formData.get("profesor_id"),
        precio_individual: formData.get("precio_individual"),
        precio_suscripcion: formData.get("precio_suscripcion"),
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
        fecha: formData.get("fecha"),
        hora_inicio: formData.get("hora_inicio"),
        hora_fin: formData.get("hora_fin"),
        sala_id: formData.get("sala_id"),
        profesor_id: formData.get("profesor_id"),
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

export type ClasePrecioFormState = {
    error?: string;
    success?: boolean;
    tipo?: string;
    precio?: number;
};

export async function updateClasePrecio(
    claseId: string,
    prevState: ClasePrecioFormState,
    formData: FormData
): Promise<ClasePrecioFormState> {
    const tipo = formData.get("tipo") as string;
    const precioRaw = formData.get("precio") as string;
    const precio = parseFloat(precioRaw);

    if (!tipo || (tipo !== "mensualidad" && tipo !== "individual")) {
        return { error: "Tipo de precio inválido" };
    }
    if (isNaN(precio) || precio <= 0) {
        return { error: "El precio debe ser un valor mayor a cero" };
    }

    try {
        const res = await serverApi(`/clases/${claseId}/precio`, {
            method: "PUT",
            body: JSON.stringify({ tipo, precio }),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return { error: errorData.detail || "Error al actualizar el precio" };
        }
    } catch (error) {
        console.error("Update Precio Error:", error);
        return { error: "Something went wrong" };
    }

    revalidatePath("/clases");
    return { success: true, tipo, precio };
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
