"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { serverApi, SERVER_API_URL } from "@/lib/server-api";

const loginSchema = z.object({
    email: z.string().email("Email invalido"),
    password: z.string().min(1, "Debe ingresar su contraseña"),
});

const signupSchema = z.object({
    email: z.string().email("Email invalido"),
    telefono: z.string().optional(),
    nombre: z.string().min(1, "El nombre es requerido"),
    apellido: z.string().min(1, "El apellido es requerido"),
    fecha_nacimiento: z.string().min(1, "Fecha de nacimiento invalida"),
    dni: z.string().optional(),
    genero: z.enum(["femenino", "masculino", "no_binario", "prefiero_no_decir", "otro"], {
        error: "Selecciona un genero",
    }),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

const medicalRecordFieldsSchema = z.object({
        emergency_name: z.string().min(2, "Indica el nombre del contacto de emergencia"),
        emergency_relationship: z.string().min(2, "Indica la relacion del contacto de emergencia"),
        emergency_phone: z.string().min(3, "Indica el telefono del contacto de emergencia"),
        medical_conditions: z.array(z.string()).min(1, "Selecciona al menos una opcion"),
        medical_other: z.string().optional(),
        smoked: z.string().min(1, "Indica si fuma o ha fumado"),
        alcohol: z.string().min(1, "Indica si consume alcohol"),
        recent_symptoms: z.string().min(1, "Indica si tuvo sintomas recientes"),
        sleep_hours: z.string().min(1, "Indica las horas de sueño promedio"),
        sleep_difficulty: z.string().min(1, "Indica si tiene dificultad para dormir"),
        diet_supplements: z.string().min(1, "Indica si sigue alguna dieta especial o suplementacion"),
        surgery_descriptions: z.array(z.string()).default([]),
        surgery_dates: z.array(z.string()).default([]),
        surgery_complications: z.array(z.string()).default([]),
        allergies: z.string().optional(),
        current_medication: z.string().optional(),
        physical_activity: z.string().min(1, "Indica si realiza actividad fisica actualmente"),
        activity_frequency: z.string().optional(),
        goals: z.array(z.string()).min(1, "Selecciona al menos un objetivo principal"),
    });

const medicalRecordSchema = medicalRecordFieldsSchema
    .refine(
        (data) => !data.medical_conditions.includes("Otros") || Boolean(data.medical_other?.trim()),
        {
            message: "Completa el detalle de otros antecedentes medicos",
            path: ["medical_other"],
        }
    );

const publicMedicalRecordSchema = medicalRecordFieldsSchema
    .extend({
        token: z.string().min(1, "Token invalido"),
        consent: z.literal("on", {
            error: "Debes aceptar el consentimiento y declaracion jurada",
        }),
    })
    .refine(
        (data) => !data.medical_conditions.includes("Otros") || Boolean(data.medical_other?.trim()),
        {
            message: "Completa el detalle de otros antecedentes medicos",
            path: ["medical_other"],
        }
    );

export type LoginState = {
    error?: string;
    success?: boolean;
};

export type SignupState = {
    error?: string;
    success?: boolean;
    message?: string;
    values?: SignupFormValues;
    fieldErrors?: Partial<Record<keyof SignupFormValues | "password" | "_form", string>>;
};

export type MedicalRecordState = {
    error?: string;
    success?: boolean;
    values?: MedicalRecordFormValues;
    fieldErrors?: Record<string, string>;
};

export type SignupFormValues = {
    email?: string;
    telefono?: string;
    nombre?: string;
    apellido?: string;
    fecha_nacimiento?: string;
    dni?: string;
    genero?: string;
};

type SignupFieldErrors = NonNullable<SignupState["fieldErrors"]>;
type MedicalRecordFieldErrors = NonNullable<MedicalRecordState["fieldErrors"]>;

export type MedicalRecordSurgeryValues = {
    description?: string;
    date?: string;
    complications?: string;
};

export type MedicalRecordFormValues = {
    emergency_name?: string;
    emergency_relationship?: string;
    emergency_phone?: string;
    medical_conditions?: string[];
    medical_other?: string;
    smoked?: string;
    alcohol?: string;
    recent_symptoms?: string;
    sleep_hours?: string;
    sleep_difficulty?: string;
    diet_supplements?: string;
    surgeries?: MedicalRecordSurgeryValues[];
    allergies?: string;
    current_medication?: string;
    physical_activity?: string;
    activity_frequency?: string;
    goals?: string[];
    consent?: boolean;
};

const cookieBase = {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
};

async function setAuthCookies(accessToken: string, refreshToken: string) {
    const cookieStore = await cookies();

    cookieStore.set("access_token", accessToken, {
        ...cookieBase,
        httpOnly: false,
        maxAge: 30 * 60,
    });

    cookieStore.set("refresh_token", refreshToken, {
        ...cookieBase,
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 60,
    });
}

function getFormString(formData: FormData, name: string): string {
    return String(formData.get(name) || "");
}

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

function getAgeFromIso(isoDate: string): number {
    const [year, month, day] = isoDate.split("-").map(Number);
    const birthDate = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const birthdayThisYear = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    if (today < birthdayThisYear) age--;
    return age;
}

function getSignupFieldErrors(error: z.ZodError): SignupFieldErrors {
    return error.issues.reduce<SignupFieldErrors>((errors, issue) => {
        const field = issue.path[0] as keyof NonNullable<SignupState["fieldErrors"]> | undefined;
        if (field && !errors[field]) errors[field] = issue.message;
        return errors;
    }, {});
}

function getMedicalRecordFieldErrors(error: z.ZodError): MedicalRecordFieldErrors {
    return error.issues.reduce<MedicalRecordFieldErrors>((errors, issue) => {
        const field = String(issue.path[0] || "_form");
        if (!errors[field]) errors[field] = issue.message;
        return errors;
    }, {});
}

function buildMedicalRecordValues(formData: FormData): MedicalRecordFormValues {
    const surgeryDescriptions = formData.getAll("surgery_description").map(String);
    const surgeryDates = formData.getAll("surgery_date").map(String);
    const surgeryComplications = formData.getAll("surgery_complications").map(String);
    const surgeryCount = Math.max(
        1,
        surgeryDescriptions.length,
        surgeryDates.length,
        surgeryComplications.length
    );

    return {
        emergency_name: getFormString(formData, "emergency_name"),
        emergency_relationship: getFormString(formData, "emergency_relationship"),
        emergency_phone: getFormString(formData, "emergency_phone"),
        medical_conditions: formData.getAll("medical_conditions").map(String),
        medical_other: getFormString(formData, "medical_other"),
        smoked: getFormString(formData, "smoked"),
        alcohol: getFormString(formData, "alcohol"),
        recent_symptoms: getFormString(formData, "recent_symptoms"),
        sleep_hours: getFormString(formData, "sleep_hours"),
        sleep_difficulty: getFormString(formData, "sleep_difficulty"),
        diet_supplements: getFormString(formData, "diet_supplements"),
        surgeries: Array.from({ length: surgeryCount }).map((_, index) => ({
            description: surgeryDescriptions[index] || "",
            date: surgeryDates[index] || "",
            complications: surgeryComplications[index] || "",
        })),
        allergies: getFormString(formData, "allergies"),
        current_medication: getFormString(formData, "current_medication"),
        physical_activity: getFormString(formData, "physical_activity"),
        activity_frequency: getFormString(formData, "activity_frequency"),
        goals: formData.getAll("goals").map(String),
        consent: formData.get("consent") === "on",
    };
}

export async function login(prevState: LoginState, formData: FormData): Promise<LoginState> {
    const validatedFields = loginSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return { error: validatedFields.error.issues[0].message };
    }

    const { email, password } = validatedFields.data;

    try {
        const res = await fetch(`${SERVER_API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
            const data = await res.json().catch(() => null);
            return { error: data?.detail || "No pudimos iniciar sesion" };
        }

        const data = await res.json();
        await setAuthCookies(data.access_token, data.refresh_token);
    } catch (error) {
        console.error("Login Error:", error);
        return { error: "No pudimos iniciar sesion. Intentalo nuevamente." };
    }

    redirect("/");
}

export async function signup(prevState: SignupState, formData: FormData): Promise<SignupState> {
    const values: SignupFormValues = {
        email: String(formData.get("email") || ""),
        telefono: String(formData.get("telefono") || ""),
        nombre: String(formData.get("nombre") || ""),
        apellido: String(formData.get("apellido") || ""),
        fecha_nacimiento: String(formData.get("fecha_nacimiento") || ""),
        dni: String(formData.get("dni") || ""),
        genero: String(formData.get("genero") || ""),
    };

    const validatedFields = signupSchema.safeParse({
        email: formData.get("email"),
        telefono: formData.get("telefono") || undefined,
        nombre: formData.get("nombre"),
        apellido: formData.get("apellido"),
        fecha_nacimiento: formData.get("fecha_nacimiento"),
        dni: formData.get("dni") || undefined,
        genero: getFormString(formData, "genero"),
        password: formData.get("password"),
    });

    if (!validatedFields.success) {
        const message = validatedFields.error.issues[0].message;
        return { error: message, fieldErrors: getSignupFieldErrors(validatedFields.error), values };
    }

    const normalizedBirthDate = normalizeBirthDate(validatedFields.data.fecha_nacimiento);

    if (!normalizedBirthDate) {
        return {
            error: "Fecha de nacimiento invalida",
            fieldErrors: { fecha_nacimiento: "Fecha de nacimiento invalida" },
            values,
        };
    }

    if (normalizedBirthDate && getAgeFromIso(normalizedBirthDate) < 14) {
        return {
            error: "Debes ser mayor a 14 a\u00f1os",
            fieldErrors: { fecha_nacimiento: "Debes ser mayor a 14 a\u00f1os" },
            values,
        };
    }

    const payload = {
        email: validatedFields.data.email,
        telefono: validatedFields.data.telefono,
        nombre: validatedFields.data.nombre,
        apellido: validatedFields.data.apellido,
        fecha_nacimiento: normalizedBirthDate,
        dni: validatedFields.data.dni,
        genero: validatedFields.data.genero,
        password: validatedFields.data.password,
    };

    try {
        const res = await fetch(`${SERVER_API_URL}/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const message = data?.detail || "No pudimos crear tu cuenta";
            const fieldErrors: SignupState["fieldErrors"] = {};
            const normalizedMessage = String(message).toLowerCase();

            if (normalizedMessage.includes("email")) fieldErrors.email = message;
            if (normalizedMessage.includes("dni")) fieldErrors.dni = message;
            if (normalizedMessage.includes("telefono") || normalizedMessage.includes("tel")) fieldErrors.telefono = message;
            if (normalizedMessage.includes("fecha")) fieldErrors.fecha_nacimiento = message;

            return {
                error: message,
                fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : { _form: message },
                values,
            };
        }

        return {
            success: true,
            message: data?.detail || "Te enviamos un email para confirmar tu cuenta",
        };
    } catch (error) {
        console.error("Signup Error:", error);
        const message = "No pudimos crear tu cuenta. Intentalo nuevamente.";
        return { error: message, fieldErrors: { _form: message }, values };
    }
}

export async function completeMedicalRecord(
    prevState: MedicalRecordState,
    formData: FormData
): Promise<MedicalRecordState> {
    const values = buildMedicalRecordValues(formData);

    const validatedFields = publicMedicalRecordSchema.safeParse({
        token: formData.get("token"),
        emergency_name: values.emergency_name,
        emergency_relationship: values.emergency_relationship,
        emergency_phone: values.emergency_phone,
        medical_conditions: values.medical_conditions || [],
        medical_other: values.medical_other || undefined,
        smoked: values.smoked,
        alcohol: values.alcohol,
        recent_symptoms: values.recent_symptoms,
        sleep_hours: values.sleep_hours,
        sleep_difficulty: values.sleep_difficulty,
        diet_supplements: values.diet_supplements,
        surgery_descriptions: values.surgeries?.map((surgery) => surgery.description || "") || [],
        surgery_dates: values.surgeries?.map((surgery) => surgery.date || "") || [],
        surgery_complications: values.surgeries?.map((surgery) => surgery.complications || "") || [],
        allergies: values.allergies || undefined,
        current_medication: values.current_medication || undefined,
        physical_activity: values.physical_activity,
        activity_frequency: values.activity_frequency || undefined,
        goals: values.goals || [],
        consent: formData.get("consent"),
    });

    if (!validatedFields.success) {
        const message = validatedFields.error.issues[0].message;
        return { error: message, fieldErrors: getMedicalRecordFieldErrors(validatedFields.error), values };
    }

    const { token } = validatedFields.data;
    const surgeries = validatedFields.data.surgery_descriptions
        .map((description, index) => ({
            descripcion: description,
            fecha: validatedFields.data.surgery_dates[index] || "",
            complicaciones_secuelas: validatedFields.data.surgery_complications[index] || "",
        }))
        .filter((surgery) =>
            Boolean(
                surgery.descripcion.trim() ||
                surgery.fecha.trim() ||
                surgery.complicaciones_secuelas.trim()
            )
        );
    const cuerpoFicha = JSON.stringify(
        {
            contacto_emergencia: {
                nombre: validatedFields.data.emergency_name,
                relacion: validatedFields.data.emergency_relationship,
                telefono: validatedFields.data.emergency_phone,
            },
            antecedentes_medicos: {
                afecciones: validatedFields.data.medical_conditions,
                especifique_otros: validatedFields.data.medical_other || "",
            },
            informacion_adicional_salud: {
                fuma_o_ha_fumado: validatedFields.data.smoked,
                consume_alcohol: validatedFields.data.alcohol,
                mareos_falta_aire_o_dolor_pecho: validatedFields.data.recent_symptoms,
                horas_sueno_promedio: validatedFields.data.sleep_hours,
                dificultad_para_dormir: validatedFields.data.sleep_difficulty,
                dieta_especial_o_suplementacion: validatedFields.data.diet_supplements,
            },
            historial_cirugias: surgeries,
            alergias_y_medicacion: {
                alergias: validatedFields.data.allergies || "",
                medicacion_actual: validatedFields.data.current_medication || "",
            },
            actividad_fisica_y_objetivos: {
                realiza_actividad_fisica_actualmente: validatedFields.data.physical_activity,
                frecuencia: validatedFields.data.activity_frequency || "",
                objetivo_principal: validatedFields.data.goals,
            },
            consentimiento_y_declaracion_jurada: {
                aceptado: true,
                texto:
                    "Declaro que la información proporcionada es verdadera y completa. Me comprometo a informar cualquier cambio en mi estado de salud y asumo la responsabilidad de realizar actividad física bajo mi propio riesgo.",
            },
        },
        null,
        2
    );

    try {
        const res = await fetch(`${SERVER_API_URL}/auth/signup/ficha-medica`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                token,
                cuerpo_ficha: cuerpoFicha,
            }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            let errorMsg = "No pudimos guardar la ficha medica";
            if (data?.detail) {
                errorMsg = Array.isArray(data.detail) ? data.detail[0]?.msg : data.detail;
            }
            return { error: errorMsg, fieldErrors: { _form: errorMsg }, values };
        }

        await setAuthCookies(data.access_token, data.refresh_token);
    } catch (error) {
        console.error("Medical Record Error:", error);
        const message = "No pudimos guardar la ficha medica. Intentalo nuevamente.";
        return { error: message, fieldErrors: { _form: message }, values };
    }

    redirect("/");
}

export type PasswordResetState = {
    error?: string;
    success?: boolean;
    fieldErrors?: Partial<Record<'email' | 'new_password' | '_form', string>>;
};

const passwordEmailSchema = z.string().email("Email inválido");

export async function requestPasswordReset(prevState: PasswordResetState, formData: FormData): Promise<PasswordResetState> {
    const email = String(formData.get("email") || "").trim();
    const validated = passwordEmailSchema.safeParse(email);
    if (!validated.success) {
        return { error: validated.error.issues[0].message, fieldErrors: { email: validated.error.issues[0].message } };
    }

    try {
        const res = await fetch(`${SERVER_API_URL}/auth/password/forgot`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            const message = data?.detail || "No pudimos enviar el email de reseteo.";
            return { error: message, fieldErrors: { _form: message } };
        }

        return { success: true };
    } catch (err) {
        console.error(err);
        return { error: "No pudimos procesar la solicitud. Intentalo nuevamente.", fieldErrors: { _form: "No pudimos procesar la solicitud. Intentalo nuevamente." } };
    }
}

export async function resetPassword(prevState: PasswordResetState, formData: FormData): Promise<PasswordResetState> {
    const token = String(formData.get("token") || "").trim();
    const newPassword = String(formData.get("new_password") || "");
    const confirmPassword = String(formData.get("confirm_password") || "");

    if (newPassword.length < 8) {
        return { error: "La contraseña debe tener al menos 8 caracteres", fieldErrors: { new_password: "La contraseña debe tener al menos 8 caracteres" } };
    }
    if (newPassword !== confirmPassword) {
        return { error: "Las contraseñas no coinciden", fieldErrors: { new_password: "Las contraseñas no coinciden" } };
    }

    try {
        const res = await fetch(`${SERVER_API_URL}/auth/password/reset`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, new_password: newPassword }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const message = data?.detail || "No pudimos cambiar la contraseña.";
            return { error: message, fieldErrors: { _form: message } };
        }

        return { success: true };
    } catch (err) {
        console.error(err);
        return { error: "No pudimos procesar la solicitud. Intentalo nuevamente.", fieldErrors: { _form: "No pudimos procesar la solicitud. Intentalo nuevamente." } };
    }
}

export async function updateMedicalRecord(
    prevState: MedicalRecordState,
    formData: FormData
): Promise<MedicalRecordState> {
    const values = buildMedicalRecordValues(formData);

    const merged = {
        emergency_name: values.emergency_name || "",
        emergency_relationship: values.emergency_relationship || "",
        emergency_phone: values.emergency_phone || "",
        medical_conditions: values.medical_conditions || [],
        medical_other: values.medical_other || undefined,
        smoked: values.smoked || "",
        alcohol: values.alcohol || "",
        recent_symptoms: values.recent_symptoms || "",
        sleep_hours: values.sleep_hours || "",
        sleep_difficulty: values.sleep_difficulty || "",
        diet_supplements: values.diet_supplements || "",
        surgeries: values.surgeries || [],
        allergies: values.allergies || undefined,
        current_medication: values.current_medication || undefined,
        physical_activity: values.physical_activity || "",
        activity_frequency: values.activity_frequency || undefined,
        goals: values.goals || [],
    };

    const validatedFields = medicalRecordSchema.safeParse({
        emergency_name: merged.emergency_name,
        emergency_relationship: merged.emergency_relationship,
        emergency_phone: merged.emergency_phone,
        medical_conditions: merged.medical_conditions || [],
        medical_other: merged.medical_other || undefined,
        smoked: merged.smoked,
        alcohol: merged.alcohol,
        recent_symptoms: merged.recent_symptoms,
        sleep_hours: merged.sleep_hours,
        sleep_difficulty: merged.sleep_difficulty,
        diet_supplements: merged.diet_supplements,
        surgery_descriptions: merged.surgeries?.map((surgery) => surgery.description || "") || [],
        surgery_dates: merged.surgeries?.map((surgery) => surgery.date || "") || [],
        surgery_complications: merged.surgeries?.map((surgery) => surgery.complications || "") || [],
        allergies: merged.allergies || undefined,
        current_medication: merged.current_medication || undefined,
        physical_activity: merged.physical_activity,
        activity_frequency: merged.activity_frequency || undefined,
        goals: merged.goals || [],
    });

    if (!validatedFields.success) {
        const message = validatedFields.error.issues[0].message;
        return { error: message, fieldErrors: getMedicalRecordFieldErrors(validatedFields.error), values };
    }

    const surgeries = validatedFields.data.surgery_descriptions
        .map((description, index) => ({
            descripcion: description,
            fecha: validatedFields.data.surgery_dates[index] || "",
            complicaciones_secuelas: validatedFields.data.surgery_complications[index] || "",
        }))
        .filter((surgery) => Boolean(surgery.descripcion.trim() || surgery.fecha.trim() || surgery.complicaciones_secuelas.trim()));

    const cuerpoFicha = JSON.stringify(
        {
            contacto_emergencia: {
                nombre: validatedFields.data.emergency_name,
                relacion: validatedFields.data.emergency_relationship,
                telefono: validatedFields.data.emergency_phone,
            },
            antecedentes_medicos: {
                afecciones: validatedFields.data.medical_conditions,
                especifique_otros: validatedFields.data.medical_other || "",
            },
            informacion_adicional_salud: {
                fuma_o_ha_fumado: validatedFields.data.smoked,
                consume_alcohol: validatedFields.data.alcohol,
                mareos_falta_aire_o_dolor_pecho: validatedFields.data.recent_symptoms,
                horas_sueno_promedio: validatedFields.data.sleep_hours,
                dificultad_para_dormir: validatedFields.data.sleep_difficulty,
                dieta_especial_o_suplementacion: validatedFields.data.diet_supplements,
            },
            historial_cirugias: surgeries,
            alergias_y_medicacion: {
                alergias: validatedFields.data.allergies || "",
                medicacion_actual: validatedFields.data.current_medication || "",
            },
            actividad_fisica_y_objetivos: {
                realiza_actividad_fisica_actualmente: validatedFields.data.physical_activity,
                frecuencia: validatedFields.data.activity_frequency || "",
                objetivo_principal: validatedFields.data.goals,
            },
            consentimiento_y_declaracion_jurada: {
                aceptado: true,
                texto:
                    "Declaro que la información proporcionada es verdadera y completa. Me comprometo a informar cualquier cambio en mi estado de salud y asumo la responsabilidad de realizar actividad física bajo mi propio riesgo.",
            },
        },
        null,
        2
    );

    try {
        const res = await serverApi("/auth/perfil/ficha-medica", {
            method: "PUT",
            body: JSON.stringify({ cuerpo_ficha: cuerpoFicha }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            let errorMsg = "No pudimos guardar la ficha medica";
            if (data?.detail) {
                errorMsg = Array.isArray(data.detail) ? data.detail[0]?.msg : data.detail;
            }
            return { error: errorMsg, fieldErrors: { _form: errorMsg }, values };
        }

        revalidatePath("/profile");
        return { success: true };
    } catch (error) {
        console.error("Update Medical Record Error:", error);
        const message = "No pudimos guardar la ficha medica. Intentalo nuevamente.";
        return { error: message, fieldErrors: { _form: message }, values };
    }
}

export async function logout() {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;
    const accessToken = cookieStore.get("access_token")?.value;

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
            // Backend unavailable: clear the local session anyway.
        }
    }

    cookieStore.delete("access_token");
    cookieStore.delete("refresh_token");
    redirect("/auth/login");
}
