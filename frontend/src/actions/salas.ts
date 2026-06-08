"use server";

import { z } from "zod";
import { serverApi } from "@/lib/server-api";
import { revalidatePath } from "next/cache";
import { Sala } from "@/types/api";

const createSalaSchema = z.object({
    nombre: z.string().min(1, "El nombre es requerido"),
    capacidad: z.coerce.number().int().min(1).optional(),
});

const updateSalaSchema = z.object({
    nombre: z.string().min(1, "El nombre es requerido").optional(),
    capacidad: z.coerce.number().int().min(1).optional(),
});

export type SalaFormState = {
    error?: string;
    success?: boolean;
};

export async function getSalas(): Promise<Sala[]> {
    try {
        const res = await serverApi("/salas/");
        if (!res.ok) return [];
        return res.json();
    } catch (error) {
        console.error("Get Salas Error:", error);
        return [];
    }
}

export async function createSala(
    prevState: SalaFormState,
    formData: FormData
): Promise<SalaFormState> {
    const cupoRaw = formData.get("capacidad");

    const validatedFields = createSalaSchema.safeParse({
        nombre: formData.get("nombre"),
        capacidad: cupoRaw && String(cupoRaw).trim() !== "" ? cupoRaw : undefined,
    });

    if (!validatedFields.success) {
        return { error: validatedFields.error.issues[0].message };
    }

    try {
        const res = await serverApi("/salas/", {
            method: "POST",
            body: JSON.stringify(validatedFields.data),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return { error: errorData.detail || "Error al crear la sala" };
        }
    } catch (error) {
        console.error("Create Sala Error:", error);
        return { error: "Something went wrong" };
    }

    revalidatePath("/salas");
    return { success: true };
}

export async function updateSala(
    salaId: string,
    prevState: SalaFormState,
    formData: FormData
): Promise<SalaFormState> {
    const cupoRaw = formData.get("capacidad");

    const validatedFields = updateSalaSchema.safeParse({
        nombre: formData.get("nombre") || undefined,
        capacidad: cupoRaw && String(cupoRaw).trim() !== "" ? cupoRaw : undefined,
    });

    if (!validatedFields.success) {
        return { error: validatedFields.error.issues[0].message };
    }

    try {
        const res = await serverApi(`/salas/${salaId}`, {
            method: "PUT",
            body: JSON.stringify(validatedFields.data),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return { error: errorData.detail || "Error al actualizar la sala" };
        }
    } catch (error) {
        console.error("Update Sala Error:", error);
        return { error: "Something went wrong" };
    }

    revalidatePath("/salas");
    return { success: true };
}

export async function deleteSala(
    salaId: string
): Promise<{ success?: boolean; error?: string }> {
    try {
        const res = await serverApi(`/salas/${salaId}`, {
            method: "DELETE",
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return { error: errorData.detail || "Error al dar de baja la sala" };
        }
    } catch (error) {
        console.error("Delete Sala Error:", error);
        return { error: "Something went wrong" };
    }

    revalidatePath("/salas");
    return { success: true };
}
