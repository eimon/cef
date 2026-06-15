"use server";

import { z } from "zod";
import { serverApi } from "@/lib/server-api";
import { revalidatePath } from "next/cache";
import { User, UserRole } from "@/types/api";

const createUserSchema = z.object({
    email: z.string().email("Email inválido"),
    telefono: z.string().optional(),
    nombre: z.string().optional(),
    apellido: z.string().optional(),
    dni: z.string().optional(),
    role: z.nativeEnum(UserRole),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
}).superRefine((data, ctx) => {
    if (data.role !== UserRole.CLIENTE && !data.dni?.trim()) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "El DNI es obligatorio para usuarios no clientes",
            path: ["dni"],
        });
    }
});

const updateUserSchema = z.object({
    nombre: z.string().optional(),
    apellido: z.string().optional(),
    dni: z.string().optional(),
    role: z.nativeEnum(UserRole).optional(),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").optional().or(z.literal("")),
}).superRefine((data, ctx) => {
    if (data.role && data.role !== UserRole.CLIENTE && !data.dni?.trim()) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "El DNI es obligatorio para usuarios no clientes",
            path: ["dni"],
        });
    }
});

export type UserFormState = {
    error?: string;
    success?: boolean;
    message?: string;
};

export type GetUsersParams = {
    dni?: string;
    nombre?: string;
    apellido?: string;
};

export async function getUsers(filters?: GetUsersParams): Promise<User[]> {
    try {
        const params = filters
            ? Object.fromEntries(
                  Object.entries(filters)
                      .map(([key, value]) => [key, typeof value === "string" ? value.trim() : value])
                      .filter(([, value]) => typeof value === "string" && value !== "")
              )
            : undefined;

        const res = await serverApi("/users/", {
            params: params as Record<string, string> | undefined,
        });

        if (!res.ok) return [];
        return res.json();
    } catch (error) {
        console.error("Get Users Error:", error);
        return [];
    }
}

export async function createUser(prevState: UserFormState, formData: FormData): Promise<UserFormState> {
    const validatedFields = createUserSchema.safeParse({
        email: formData.get("new_user_email") || formData.get("email"),
        telefono: formData.get("telefono") || undefined,
        nombre: formData.get("nombre") || undefined,
        apellido: formData.get("apellido") || undefined,
        dni: formData.get("dni") || undefined,
        role: formData.get("role"),
        password: formData.get("new_user_password") || formData.get("password"),
    });

    if (!validatedFields.success) {
        return { error: validatedFields.error.issues[0].message };
    }

    try {
        const res = await serverApi("/auth/register", {
            method: "POST",
            body: JSON.stringify(validatedFields.data),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return { error: errorData.detail || "Failed to create user" };
        }
    } catch (error) {
        console.error("Create User Error:", error);
        return { error: "Something went wrong" };
    }

    revalidatePath("/users/personal");
    revalidatePath("/users/clientes");
    const message = validatedFields.data.role === UserRole.CLIENTE
        ? "Usuario agregado correctamente"
        : "Usuario agregado correctamente. Se envió un mail con la contraseña.";

    return { success: true, message };
}

export async function updateUser(
    userId: string,
    prevState: UserFormState,
    formData: FormData
): Promise<UserFormState> {
    const rawPassword = formData.get("password") as string;

    const validatedFields = updateUserSchema.safeParse({
        nombre: formData.get("nombre") || undefined,
        apellido: formData.get("apellido") || undefined,
        dni: formData.get("dni") || undefined,
        role: formData.get("role") || undefined,
        password: rawPassword || undefined,
    });

    if (!validatedFields.success) {
        return { error: validatedFields.error.issues[0].message };
    }

    const data = validatedFields.data;
    // Remove empty password
    if (!data.password) {
        delete data.password;
    }

    try {
        const res = await serverApi(`/users/${userId}`, {
            method: "PUT",
            body: JSON.stringify(data),
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return { error: errorData.detail || "Failed to update user" };
        }
    } catch (error) {
        console.error("Update User Error:", error);
        return { error: "Something went wrong" };
    }

    revalidatePath("/users/personal");
    revalidatePath("/users/clientes");
    return { success: true };
}

export async function getMe(): Promise<User | null> {
    try {
        const res = await serverApi("/users/me");
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

export async function deleteUser(userId: string): Promise<{ success?: boolean; error?: string }> {
    try {
        const res = await serverApi(`/users/${userId}`, {
            method: "DELETE",
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return {
                error:
                    errorData.detail ||
                    errorData.message ||
                    "Failed to delete user",
            };
        }
    } catch (error) {
        console.error("Delete User Error:", error);
        return { error: "Something went wrong" };
    }

    revalidatePath("/users/personal");
    revalidatePath("/users/clientes");
    return { success: true };
}
