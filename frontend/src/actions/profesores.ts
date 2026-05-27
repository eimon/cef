"use server";

import { z } from "zod";
import { serverApi } from "@/lib/server-api";
import { revalidatePath } from "next/cache";
import { Profesor } from "@/types/api";

const createProfesorSchema = z.object({
    dni: z.string().min(1, "El DNI es requerido"),
    nombre: z.string().min(1, "El nombre es requerido"),
    apellido: z.string().min(1, "El apellido es requerido"),
    genero: z.string().min(1, "El género es requerido"),
    email: z.string().email("Email inválido").optional(),
    telefono: z.string().optional(),
});

const updateProfesorSchema = z.object({
    dni: z.string().min(1, "El DNI es requerido").optional(),
    nombre: z.string().min(1, "El nombre es requerido").optional(),
    apellido: z.string().min(1, "El apellido es requerido").optional(),
    genero: z.string().min(1, "El género es requerido").optional(),
    email: z.string().email("Email inválido").optional(),
    telefono: z.string().optional(),
});

export type ProfesorFormState = {
    error?: string;
    success?: boolean;
};

export type GetProfesoresParams = {
    dni?: string;
    nombre?: string;
    apellido?: string;
};

export async function getProfesorByDni(dni: string): Promise<Profesor | null> {
    try {
        const res = await serverApi(`/profesores/?dni=${encodeURIComponent(dni)}`);
        if (!res.ok) return null;
        const data: Profesor[] = await res.json();
        return data.find((p) => p.dni === dni) ?? null;
    } catch (error) {
        console.error("Get Profesor By DNI Error:", error);
        return null;
    }
}

export async function getProfesores(params: GetProfesoresParams = {}): Promise<Profesor[]> {
    try {
        const searchParams = new URLSearchParams();
        if (params.dni?.trim()) searchParams.append("dni", params.dni.trim());
        if (params.nombre?.trim()) searchParams.append("nombre", params.nombre.trim());
        if (params.apellido?.trim()) searchParams.append("apellido", params.apellido.trim());

        const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
        const res = await serverApi(`/profesores/${query}`);
        if (!res.ok) return [];
        return res.json();
    } catch (error) {
        console.error("Get Profesores Error:", error);
        return [];
    }
}

export async function createProfesor(
    prevState: ProfesorFormState,
    formData: FormData
): Promise<ProfesorFormState> {
    const emailRaw = formData.get("email") as string | null;

    const validatedFields = createProfesorSchema.safeParse({
        dni: formData.get("dni"),
        nombre: formData.get("nombre"),
        apellido: formData.get("apellido"),
        genero: formData.get("genero"),
        email: emailRaw?.trim() || undefined,
        telefono: formData.get("telefono") || undefined,
    });

    if (!validatedFields.success) {
        return { error: validatedFields.error.issues[0].message };
    }

    try {
        const res = await serverApi("/profesores/", {
            method: "POST",
            body: JSON.stringify(validatedFields.data),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return { error: errorData.detail || "Error al crear el profesor" };
        }
    } catch (error) {
        console.error("Create Profesor Error:", error);
        return { error: "Something went wrong" };
    }

    revalidatePath("/profesores");
    return { success: true };
}

export async function updateProfesor(
    profesorId: string,
    prevState: ProfesorFormState,
    formData: FormData
): Promise<ProfesorFormState> {
    const emailRaw = formData.get("email") as string | null;

    const validatedFields = updateProfesorSchema.safeParse({
        dni: formData.get("dni") || undefined,
        nombre: formData.get("nombre") || undefined,
        apellido: formData.get("apellido") || undefined,
        genero: formData.get("genero") || undefined,
        email: emailRaw?.trim() || undefined,
        telefono: formData.get("telefono") || undefined,
    });

    if (!validatedFields.success) {
        return { error: validatedFields.error.issues[0].message };
    }

    try {
        const res = await serverApi(`/profesores/${profesorId}`, {
            method: "PUT",
            body: JSON.stringify(validatedFields.data),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return { error: errorData.detail || "Error al actualizar el profesor" };
        }
    } catch (error) {
        console.error("Update Profesor Error:", error);
        return { error: "Something went wrong" };
    }

    revalidatePath("/profesores");
    return { success: true };
}

export async function deleteProfesor(
    profesorId: string
): Promise<{ success?: boolean; error?: string }> {
    try {
        const res = await serverApi(`/profesores/${profesorId}`, {
            method: "DELETE",
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return { error: errorData.detail || "Error al dar de baja al profesor" };
        }
    } catch (error) {
        console.error("Delete Profesor Error:", error);
        return { error: "Something went wrong" };
    }

    revalidatePath("/profesores");
    return { success: true };
}
