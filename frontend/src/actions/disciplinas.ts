"use server";

import { serverApi } from "@/lib/server-api";
import { Disciplina, PrecioDisciplina } from "@/types/api";
import { revalidatePath } from "next/cache";

export type DisciplinaPrecioFormState = {
    error?: string;
    success?: boolean;
};

export async function getDisciplinaPrecios(): Promise<PrecioDisciplina[]> {
    try {
        const res = await serverApi("/precios/disciplinas");
        if (!res.ok) return [];
        return res.json();
    } catch {
        return [];
    }
}

export async function updateDisciplinaPrecio(
    disciplina: Disciplina,
    prevState: DisciplinaPrecioFormState,
    formData: FormData
): Promise<DisciplinaPrecioFormState> {
    const precioIndividual = parseFloat(formData.get("precio_individual") as string);
    const precioSuscripcion = parseFloat(formData.get("precio_suscripcion") as string);

    if (isNaN(precioIndividual) || precioIndividual <= 0) {
        return { error: "El precio individual debe ser un valor mayor a cero" };
    }
    if (isNaN(precioSuscripcion) || precioSuscripcion <= 0) {
        return { error: "El precio de mensualidad debe ser un valor mayor a cero" };
    }

    try {
        const res = await serverApi(`/precios/disciplinas/${disciplina}`, {
            method: "PUT",
            body: JSON.stringify({
                precio_individual: precioIndividual,
                precio_suscripcion: precioSuscripcion,
            }),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return { error: errorData.detail || "Error al actualizar el precio" };
        }
    } catch {
        return { error: "Error al actualizar el precio" };
    }

    revalidatePath("/precios");
    return { success: true };
}
