"use server";

import { serverApi } from "@/lib/server-api";
import type { User } from "@/types/api";
import { revalidatePath } from "next/cache";

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

export type PersonalDataFormValues = {
    dni?: string;
    nombre?: string;
    apellido?: string;
    genero?: string;
    telefono?: string;
    fecha_nacimiento?: string;
};

export type PersonalDataState = {
    error?: string;
    success?: boolean;
    values?: PersonalDataFormValues;
    fieldErrors?: Partial<Record<keyof PersonalDataFormValues | "_form", string>>;
};

function isValidDateParts(year: number, month: number, day: number): boolean {
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function normalizeBirthDate(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
        const [, yyyy, mm, dd] = isoMatch;
        const year = Number(yyyy);
        const month = Number(mm);
        const day = Number(dd);
        return isValidDateParts(year, month, day) ? `${yyyy}-${mm}-${dd}` : null;
    }

    const dmyMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!dmyMatch) return null;

    const [, dd, mm, yyyy] = dmyMatch;
    const year = Number(yyyy);
    const month = Number(mm);
    const day = Number(dd);
    return isValidDateParts(year, month, day) ? `${yyyy}-${mm}-${dd}` : null;
}

function parseIsoDate(value?: string | null) {
    if (!value) return null;
    const [y, m, d] = value.split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
}

function getEdadFromIso(isoDate?: string | null): number {
    const fecha = parseIsoDate(isoDate);
    if (!fecha) return NaN;
    const hoy = new Date();
    let edad = hoy.getFullYear() - fecha.getFullYear();
    const cumpleEsteAno = new Date(hoy.getFullYear(), fecha.getMonth(), fecha.getDate());
    if (hoy < cumpleEsteAno) edad--;
    return edad;
}

export async function updatePersonalData(
    prevState: PersonalDataState,
    formData: FormData
): Promise<PersonalDataState> {
    const values: PersonalDataFormValues = {
        dni: String(formData.get("dni") || "").trim(),
        nombre: String(formData.get("nombre") || "").trim(),
        apellido: String(formData.get("apellido") || "").trim(),
        genero: String(formData.get("genero") || "").trim(),
        telefono: String(formData.get("telefono") || "").trim(),
        fecha_nacimiento: String(formData.get("fecha_nacimiento") || "").trim(),
    };

    // Fetch current profile to preserve existing values when fields left blank
    const currentRes = await serverApi("/auth/perfil");
    let currentProfile: Partial<User> = {};
    if (currentRes.ok) {
        currentProfile = await currentRes.json().catch(() => ({}));
    }

    const payload: PersonalDataFormValues = {};

    // For each field, if left blank, keep current value
    payload.dni = values.dni || currentProfile.dni || undefined;
    payload.nombre = values.nombre || currentProfile.nombre || undefined;
    payload.apellido = values.apellido || currentProfile.apellido || undefined;
    payload.genero = values.genero || currentProfile.genero || undefined;
    payload.telefono = values.telefono || currentProfile.telefono || undefined;

    // Convert fecha_nacimiento from DD/MM/YYYY to ISO if needed
    const iso = values.fecha_nacimiento
        ? normalizeBirthDate(values.fecha_nacimiento)
        : currentProfile?.fecha_nacimiento || undefined;

    if (values.fecha_nacimiento && !iso) {
        return {
            error: "Ingresa una fecha valida con formato DD/MM/AAAA",
            fieldErrors: { fecha_nacimiento: "Ingresa una fecha valida con formato DD/MM/AAAA" },
            values,
        };
    }

    // Validate age if provided
    if (iso) {
        const edad = getEdadFromIso(iso);
        if (!Number.isFinite(edad) || edad < 14) {
            return {
                error: "Debes ser mayor a 14 a\u00f1os",
                fieldErrors: { fecha_nacimiento: "Debes ser mayor a 14 a\u00f1os" },
                values,
            };
        }
        payload.fecha_nacimiento = iso;
    }

    try {
        const res = await serverApi("/auth/perfil", {
            method: "PATCH",
            body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const message = Array.isArray(data?.detail)
                ? data.detail[0]?.msg || "No pudimos actualizar tus datos"
                : data?.detail || "No pudimos actualizar tus datos";
            const fieldErrors: PersonalDataState["fieldErrors"] = {};
            const normalizedMessage = String(message).toLowerCase();

            if (normalizedMessage.includes("dni")) fieldErrors.dni = message;
            if (normalizedMessage.includes("telefono") || normalizedMessage.includes("tel")) fieldErrors.telefono = message;
            if (normalizedMessage.includes("fecha")) fieldErrors.fecha_nacimiento = message;

            return {
                error: message,
                fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : { _form: message },
                values,
            };
        }

        revalidatePath("/profile");
        return { success: true };
    } catch (error) {
        console.error("Update personal data error:", error);
        const message = "No pudimos actualizar tus datos. Intentalo nuevamente.";
        return { error: message, fieldErrors: { _form: message }, values };
    }
}
