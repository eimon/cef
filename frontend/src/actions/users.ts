"use server";

import { z } from "zod";
import { serverApi } from "@/lib/server-api";
import { revalidatePath } from "next/cache";
import { User, UserRole } from "@/types/api";

const createUserSchema = z.object({
    username: z.string().min(1, "Username is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(1, "Phone is required"),
    full_name: z.string().optional(),
    role: z.nativeEnum(UserRole),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

const updateUserSchema = z.object({
    full_name: z.string().optional(),
    role: z.nativeEnum(UserRole).optional(),
    password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
});

export type UserFormState = {
    error?: string;
    success?: boolean;
};

export async function getUsers(): Promise<User[]> {
    try {
        const res = await serverApi("/users/");
        if (!res.ok) return [];
        return res.json();
    } catch (error) {
        console.error("Get Users Error:", error);
        return [];
    }
}

export async function createUser(prevState: UserFormState, formData: FormData): Promise<UserFormState> {
    const validatedFields = createUserSchema.safeParse({
        username: formData.get("username"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        full_name: formData.get("full_name") || undefined,
        role: formData.get("role"),
        password: formData.get("password"),
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

    revalidatePath("/users");
    return { success: true };
}

export async function updateUser(
    userId: string,
    prevState: UserFormState,
    formData: FormData
): Promise<UserFormState> {
    const rawPassword = formData.get("password") as string;

    const validatedFields = updateUserSchema.safeParse({
        full_name: formData.get("full_name") || undefined,
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

    revalidatePath("/users");
    return { success: true };
}

export async function deleteUser(userId: string): Promise<{ success?: boolean; error?: string }> {
    try {
        const res = await serverApi(`/users/${userId}`, {
            method: "DELETE",
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return { error: errorData.detail || "Failed to delete user" };
        }
    } catch (error) {
        console.error("Delete User Error:", error);
        return { error: "Something went wrong" };
    }

    revalidatePath("/users");
    return { success: true };
}
