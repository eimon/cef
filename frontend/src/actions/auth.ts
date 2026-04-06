"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SERVER_API_URL =
    process.env.INTERNAL_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:8000";

const loginSchema = z.object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required"),
});

export type LoginState = {
    error?: string;
    success?: boolean;
};

const cookieBase = {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
};

export async function login(prevState: LoginState, formData: FormData): Promise<LoginState> {
    const validatedFields = loginSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return { error: "Invalid input fields" };
    }

    const { username, password } = validatedFields.data;

    try {
        const backendFormData = new FormData();
        backendFormData.append("username", username);
        backendFormData.append("password", password);

        const res = await fetch(`${SERVER_API_URL}/auth/login`, {
            method: "POST",
            body: backendFormData,
        });

        if (!res.ok) {
            const data = await res.json().catch(() => null);
            return { error: data?.detail || "Authentication failed" };
        }

        const data = await res.json();
        const cookieStore = await cookies();

        // access_token: not httpOnly so axios (client-side) can read from document.cookie
        cookieStore.set("access_token", data.access_token, {
            ...cookieBase,
            httpOnly: false,
            maxAge: 30 * 60, // 30 min — matches JWT expiry
        });

        // refresh_token: httpOnly, only the server can read it
        cookieStore.set("refresh_token", data.refresh_token, {
            ...cookieBase,
            httpOnly: true,
            maxAge: 60 * 60 * 24 * 60, // 60 days
        });
    } catch (error) {
        console.error("Login Error:", error);
        return { error: "Something went wrong. Please try again." };
    }

    redirect("/");
    return { success: true };
}

export async function logout() {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;
    const accessToken = cookieStore.get("access_token")?.value;

    // Revoke refresh token on the backend (best-effort)
    if (refreshToken && accessToken) {
        try {
            await fetch(`${SERVER_API_URL}/auth/logout`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ refresh_token: refreshToken }),
            });
        } catch {
            // Backend unavailable — still clear the local session
        }
    }

    cookieStore.delete("access_token");
    cookieStore.delete("refresh_token");
    redirect("/auth/login");
}
