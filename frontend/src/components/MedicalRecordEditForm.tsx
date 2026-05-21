"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Activity,
    Ambulance,
    CheckCircle2,
    ClipboardList,
    Dumbbell,
    HeartPulse,
    Loader2,
    Pill,
    Plus,
    Stethoscope,
} from "lucide-react";

import {
    updateMedicalRecord,
    type MedicalRecordFormValues,
    type MedicalRecordState,
    type MedicalRecordSurgeryValues,
} from "@/actions/auth";
import type { MedicalRecordProfile } from "@/types/api";
import { useToast } from "@/context/ToastContext";

const initialState: MedicalRecordState = {};
const inputCls = "w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-cef-primary/60 focus:bg-white focus:ring-2 focus:ring-cef-primary/15";
const labelCls = "block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider";
const sectionCls = "glass overflow-hidden rounded-2xl border-l-4 border-l-cef-primary/70";
const sectionHeaderCls = "flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-3";
const sectionTitleCls = "text-sm font-bold uppercase tracking-wider text-slate-700";
const sectionBodyCls = "space-y-4 p-4";
const optionCls = "flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition-colors hover:border-cef-primary/30 hover:bg-cef-primary/5 [&_input]:accent-cef-primary";
const sectionIconCls = "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cef-primary text-white shadow-sm";

const medicalConditions = [
    "Ninguno",
    "Hipertensión",
    "Diabetes",
    "Asma",
    "Problemas Cardíacos",
    "Artritis",
    "Epilepsia",
    "Lesiones óseas/musculares",
    "Otros",
];

const goals = ["Pérdida de peso", "Tonificación", "Salud", "Competencia"];

function ErrorText({ message, field }: { message?: string; field?: string }) {
    if (!message) return null;
    return <p data-error-field={field} className="mt-1.5 text-xs text-cef-danger">{message}</p>;
}

function YesNoGroup({ name, value }: { name: string; value?: string }) {
    return (
        <div className="flex gap-2">
            {Array.from(["No", "Sí"]).map((option) => (
                <label key={option} className={optionCls}>
                    <input name={name} type="radio" value={option} defaultChecked={option === value} />
                    <span>{option}</span>
                </label>
            ))}
        </div>
    );
}

export default function MedicalRecordEditForm({ record }: { record: MedicalRecordProfile | null }) {
    const [state, formAction, isPending] = useActionState(updateMedicalRecord, initialState);
    const formRef = useRef<HTMLFormElement>(null);
    const submittedValues = state.values;
    const values: MedicalRecordFormValues = submittedValues || {};
    const fieldErrors = state.fieldErrors || {};
    const selectedGoals = submittedValues
        ? (submittedValues.goals || [])
        : (record?.cuerpo_ficha?.actividad_fisica_y_objetivos?.objetivo_principal || []);
    const [selectedConditions, setSelectedConditions] = useState<string[]>(
        submittedValues
            ? (submittedValues.medical_conditions || [])
            : (record?.cuerpo_ficha?.antecedentes_medicos?.afecciones || [])
    );
    const [surgeryCount, setSurgeryCount] = useState(
        Math.max(1, submittedValues?.surgeries?.length ?? record?.cuerpo_ficha?.historial_cirugias?.length ?? 1)
    );
    const { showSuccess } = useToast();
    const router = useRouter();

    const fieldValue = (submitted: string | undefined, fallback?: string | null) =>
        submittedValues ? (submitted ?? "") : (fallback || "");

    const radioValue = (field: keyof Pick<MedicalRecordFormValues, "smoked" | "alcohol" | "recent_symptoms" | "sleep_difficulty" | "physical_activity">, fallback?: string | null) =>
        submittedValues ? (submittedValues[field] || "") : (fallback || "");

    const surgeryValue = (
        index: number,
        field: keyof MedicalRecordSurgeryValues,
        fallback?: string | null
    ) => submittedValues ? (submittedValues.surgeries?.[index]?.[field] ?? "") : (fallback || "");

    useEffect(() => {
        if (state?.success) showSuccess("Ficha médica actualizada");
    }, [state?.success, showSuccess]);

    useEffect(() => {
        if (state?.success) {
            router.replace("/profile?seccion=ficha-medica");
            router.refresh();
        }
    }, [state?.success, router]);

    useEffect(() => {
        const errors = state.fieldErrors || {};
        const firstField = [
            "_form",
            "emergency_name",
            "emergency_relationship",
            "emergency_phone",
            "medical_conditions",
            "medical_other",
            "smoked",
            "alcohol",
            "recent_symptoms",
            "sleep_hours",
            "sleep_difficulty",
            "diet_supplements",
            "physical_activity",
            "goals",
        ].find((field) => errors[field]) || Object.keys(errors)[0];

        if (!firstField) return;

        const form = formRef.current;
        const target = form?.querySelector<HTMLElement>(`[data-error-field="${firstField}"]`) ||
            form?.querySelector<HTMLElement>("[aria-invalid='true']");

        target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, [state.fieldErrors]);

    const toggleCondition = (condition: string, checked: boolean) => {
        setSelectedConditions((current) => {
            if (condition === "Ninguno") {
                return checked ? ["Ninguno"] : [];
            }

            const withoutNone = current.filter((item) => item !== "Ninguno");
            if (checked) {
                return [...withoutNone, condition];
            }
            return withoutNone.filter((item) => item !== condition);
        });
    };

    return (
        <div className="glass-modal overflow-hidden rounded-2xl">
            <div className="border-b border-slate-200 bg-white px-6 py-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cef-primary text-white shadow-sm">
                            <Activity size={21} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">Editar ficha medica</h1>
                            <p className="mt-1 text-sm text-slate-500">Actualiza los campos de tu ficha medica.</p>
                        </div>
                    </div>
                    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-cef-primary/20 bg-cef-primary/10 px-3 py-1 text-xs font-semibold text-cef-primary">
                        <CheckCircle2 size={14} />
                        Editar
                    </span>
                </div>
            </div>

            <form ref={formRef} action={formAction} noValidate className="space-y-5 bg-slate-50/70 p-4 sm:p-6">
                <ErrorText message={fieldErrors._form} field="_form" />

                <section className={sectionCls}>
                    <div className={sectionHeaderCls}>
                        <div className={sectionIconCls}><Ambulance size={18} /></div>
                        <h2 className={sectionTitleCls}>Contacto de emergencia</h2>
                    </div>
                    <div className={sectionBodyCls}>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className={labelCls}>Nombre</label>
                                <input name="emergency_name" required className={inputCls} defaultValue={fieldValue(values.emergency_name, record?.cuerpo_ficha?.contacto_emergencia?.nombre)} aria-invalid={Boolean(fieldErrors.emergency_name)} />
                                <ErrorText message={fieldErrors.emergency_name} />
                            </div>
                            <div>
                                <label className={labelCls}>Relación</label>
                                <input name="emergency_relationship" required className={inputCls} defaultValue={fieldValue(values.emergency_relationship, record?.cuerpo_ficha?.contacto_emergencia?.relacion)} aria-invalid={Boolean(fieldErrors.emergency_relationship)} />
                                <ErrorText message={fieldErrors.emergency_relationship} />
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>Teléfono</label>
                            <input name="emergency_phone" required className={inputCls} defaultValue={fieldValue(values.emergency_phone, record?.cuerpo_ficha?.contacto_emergencia?.telefono)} aria-invalid={Boolean(fieldErrors.emergency_phone)} />
                            <ErrorText message={fieldErrors.emergency_phone} />
                        </div>
                    </div>
                </section>

                <section className={sectionCls}>
                    <div className={sectionHeaderCls}>
                        <div className={sectionIconCls}><HeartPulse size={18} /></div>
                        <h2 className={sectionTitleCls}>Antecedentes médicos</h2>
                    </div>
                    <div className={sectionBodyCls}>
                        <p className="text-sm text-slate-500">Marque si padece o ha padecido alguna de estas afecciones.</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {medicalConditions.map((condition) => (
                                <label key={condition} className={optionCls}>
                                    <input
                                        name="medical_conditions"
                                        type="checkbox"
                                        value={condition}
                                        checked={selectedConditions.includes(condition)}
                                        onChange={(event) => toggleCondition(condition, event.target.checked)}
                                    />
                                    <span>{condition}</span>
                                </label>
                            ))}
                        </div>
                        <ErrorText message={fieldErrors.medical_conditions} field="medical_conditions" />
                        {selectedConditions.includes("Otros") && (
                            <div>
                                <label className={labelCls}>Especifique/Otros</label>
                                <textarea name="medical_other" required rows={3} className={inputCls} defaultValue={fieldValue(values.medical_other, record?.cuerpo_ficha?.antecedentes_medicos?.especifique_otros)} aria-invalid={Boolean(fieldErrors.medical_other)} />
                                <ErrorText message={fieldErrors.medical_other} />
                            </div>
                        )}
                    </div>
                </section>

                <section className={sectionCls}>
                    <div className={sectionHeaderCls}>
                        <div className={sectionIconCls}><Stethoscope size={18} /></div>
                        <h2 className={sectionTitleCls}>Información adicional de salud</h2>
                    </div>
                    <div className={sectionBodyCls}>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className={labelCls}>Hábitos: ¿Fuma o ha fumado?</label>
                                <YesNoGroup name="smoked" value={radioValue("smoked", record?.cuerpo_ficha?.informacion_adicional_salud?.fuma_o_ha_fumado)} />
                                <ErrorText message={fieldErrors.smoked} />
                            </div>
                            <div>
                                <label className={labelCls}>¿Consume alcohol?</label>
                                <YesNoGroup name="alcohol" value={radioValue("alcohol", record?.cuerpo_ficha?.informacion_adicional_salud?.consume_alcohol)} />
                                <ErrorText message={fieldErrors.alcohol} />
                            </div>
                            <div>
                                <label className={labelCls}>Síntomas recientes: ¿Sufre de mareos, falta de aire o dolor de pecho?</label>
                                <YesNoGroup name="recent_symptoms" value={radioValue("recent_symptoms", record?.cuerpo_ficha?.informacion_adicional_salud?.mareos_falta_aire_o_dolor_pecho)} />
                                <ErrorText message={fieldErrors.recent_symptoms} />
                            </div>
                            <div>
                                <label className={labelCls}>Descanso: Horas de sueño promedio</label>
                                <input name="sleep_hours" required className={inputCls} inputMode="numeric" defaultValue={fieldValue(values.sleep_hours, record?.cuerpo_ficha?.informacion_adicional_salud?.horas_sueno_promedio)} aria-invalid={Boolean(fieldErrors.sleep_hours)} />
                                <ErrorText message={fieldErrors.sleep_hours} />
                            </div>
                            <div>
                                <label className={labelCls}>¿Dificultad para dormir?</label>
                                <YesNoGroup name="sleep_difficulty" value={radioValue("sleep_difficulty", record?.cuerpo_ficha?.informacion_adicional_salud?.dificultad_para_dormir)} />
                                <ErrorText message={fieldErrors.sleep_difficulty} />
                            </div>
                            <div>
                                <label className={labelCls}>Nutrición: ¿Sigue alguna dieta especial o suplementación?</label>
                                <input name="diet_supplements" required className={inputCls} placeholder="No / detalle" defaultValue={fieldValue(values.diet_supplements, record?.cuerpo_ficha?.informacion_adicional_salud?.dieta_especial_o_suplementacion)} aria-invalid={Boolean(fieldErrors.diet_supplements)} />
                                <ErrorText message={fieldErrors.diet_supplements} />
                            </div>
                        </div>
                    </div>
                </section>

                <section className={sectionCls}>
                    <div className={sectionHeaderCls}>
                        <div className={sectionIconCls}><ClipboardList size={18} /></div>
                        <h2 className={sectionTitleCls}>Historial de cirugías</h2>
                    </div>
                    <div className={sectionBodyCls}>
                        <p className="text-sm text-slate-500">
                            Si tuviste cirugías, cargá una por bloque con su fecha aproximada y cualquier secuela o complicación. Si no corresponde, dejalo vacío.
                        </p>
                        {Array.from({ length: surgeryCount }).map((_, index) => (
                            <div key={index} className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="mb-3 flex items-center justify-between">
                                    <span className="text-sm font-semibold text-slate-700">Cirugía {index + 1}</span>
                                    {index > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setSurgeryCount((current) => Math.max(1, current - 1))}
                                            className="text-xs font-medium text-cef-danger transition-colors hover:text-cef-danger/80"
                                        >
                                            Quitar
                                        </button>
                                    )}
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className={labelCls}>Descripción de la cirugía</label>
                                        <input name="surgery_description" className={inputCls} defaultValue={surgeryValue(index, "description", record?.cuerpo_ficha?.historial_cirugias?.[index]?.descripcion)} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Fecha</label>
                                        <input name="surgery_date" type="date" className={inputCls} defaultValue={surgeryValue(index, "date", record?.cuerpo_ficha?.historial_cirugias?.[index]?.fecha)} />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <label className={labelCls}>Complicaciones/Secuelas</label>
                                    <textarea name="surgery_complications" rows={3} className={inputCls} defaultValue={surgeryValue(index, "complications", record?.cuerpo_ficha?.historial_cirugias?.[index]?.complicaciones_secuelas)} />
                                </div>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => setSurgeryCount((current) => current + 1)}
                            className="inline-flex items-center gap-2 rounded-lg border border-cef-primary/20 bg-cef-primary/10 px-3 py-2 text-sm font-semibold text-cef-primary transition-colors hover:bg-cef-primary/15"
                        >
                            <Plus size={16} />
                            Agregar cirugía
                        </button>
                    </div>
                </section>

                <section className={sectionCls}>
                    <div className={sectionHeaderCls}>
                        <div className={sectionIconCls}><Pill size={18} /></div>
                        <h2 className={sectionTitleCls}>Alergias y medicación</h2>
                    </div>
                    <div className={sectionBodyCls}>
                        <p className="text-sm text-slate-500">
                            Indicá alergias conocidas y medicación actual con nombre y dosis. Si no tenés, podés dejarlo vacío.
                        </p>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className={labelCls}>Alergias (Medicamentos/Alimentos/Otros)</label>
                                <textarea name="allergies" rows={3} className={inputCls} defaultValue={fieldValue(values.allergies, record?.cuerpo_ficha?.alergias_y_medicacion?.alergias)} />
                            </div>
                            <div>
                                <label className={labelCls}>Medicación actual (Nombre y dosis)</label>
                                <textarea name="current_medication" rows={3} className={inputCls} defaultValue={fieldValue(values.current_medication, record?.cuerpo_ficha?.alergias_y_medicacion?.medicacion_actual)} />
                            </div>
                        </div>
                    </div>
                </section>

                <section className={sectionCls}>
                    <div className={sectionHeaderCls}>
                        <div className={sectionIconCls}><Dumbbell size={18} /></div>
                        <h2 className={sectionTitleCls}>Actividad física y objetivos</h2>
                    </div>
                    <div className={sectionBodyCls}>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className={labelCls}>¿Realiza actividad física actualmente?</label>
                                <YesNoGroup name="physical_activity" value={radioValue("physical_activity", record?.cuerpo_ficha?.actividad_fisica_y_objetivos?.realiza_actividad_fisica_actualmente)} />
                                <ErrorText message={fieldErrors.physical_activity} />
                            </div>
                            <div>
                                <label className={labelCls}>¿Frecuencia?</label>
                                <input name="activity_frequency" className={inputCls} defaultValue={fieldValue(values.activity_frequency, record?.cuerpo_ficha?.actividad_fisica_y_objetivos?.frecuencia)} />
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>Objetivo principal</label>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {goals.map((goal) => (
                                    <label key={goal} className={optionCls}>
                                        <input name="goals" type="checkbox" value={goal} defaultChecked={selectedGoals.includes(goal)} />
                                        <span>{goal}</span>
                                    </label>
                                ))}
                            </div>
                            <ErrorText message={fieldErrors.goals} />
                        </div>
                    </div>
                </section>

                <div className="flex gap-3">
                    <Link href="/profile?seccion=ficha-medica" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50">
                        Cancelar
                    </Link>
                    <button
                        type="submit"
                        disabled={isPending}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-cef-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cef-primary/80 disabled:opacity-60"
                    >
                        {isPending ? <Loader2 className="mr-2 animate-spin" size={16} /> : null}
                        Guardar ficha
                    </button>
                </div>
            </form>
        </div>
    );
}
