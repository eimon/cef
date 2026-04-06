"use server";

import { serverApi } from "@/lib/server-api";

export type ChangePasswordState = {
    error?: string;
    success?: boolean;
};

export async function changePassword(
    prevState: ChangePasswordState,
    formData: FormData
): Promise<ChangePasswordState> {
    const currentPassword = formData.get("current_password") as string;
    const newPassword = formData.get("new_password") as string;
    const confirmPassword = formData.get("confirm_password") as string;

    if (newPassword !== confirmPassword) {
        return { error: "passwordMismatch" };
    }

    const res = await serverApi("/auth/perfil", {
        method: "PUT",
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });

    if (!res.ok) {
        const data = await res.json().catch(() => null);
        return { error: data?.detail || "Error al cambiar la contraseña" };
    }

    return { success: true };
}
