"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
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
    ShieldCheck,
    Stethoscope,
} from "lucide-react";

import { completeMedicalRecord, MedicalRecordState } from "@/actions/auth";

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

function YesNoGroup({ name, value }: { name: string; value?: string }) {
    return (
        <div className="flex gap-2">
            {["No", "Sí"].map((option) => (
                <label key={option} className={optionCls}>
                    <input name={name} type="radio" value={option} required defaultChecked={option === value} />
                    <span>{option}</span>
                </label>
            ))}
        </div>
    );
}

function SectionHeader({ icon, title }: { icon: ReactNode; title: string }) {
    return (
        <div className={sectionHeaderCls}>
            <div className={sectionIconCls}>{icon}</div>
            <h2 className={sectionTitleCls}>{title}</h2>
        </div>
    );
}

export default function PublicMedicalRecordForm({ token }: { token: string }) {
    const [state, formAction, isPending] = useActionState(completeMedicalRecord, initialState);
    const values = state.values;
    const [selectedConditions, setSelectedConditions] = useState<string[]>(values?.medical_conditions || []);
    const [surgeryCount, setSurgeryCount] = useState(Math.max(1, values?.surgeries?.length || 1));

    useEffect(() => {
        if (!values) return;
        setSelectedConditions(values.medical_conditions || []);
        setSurgeryCount(Math.max(1, values.surgeries?.length || 1));
    }, [values]);

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

    if (!token) {
        return (
            <div className="glass-modal rounded-2xl p-8 text-center">
                <h1 className="text-lg font-semibold text-slate-800">Enlace invalido</h1>
                <p className="mt-2 text-sm text-slate-500">Necesitas confirmar tu email antes de completar la ficha.</p>
                <Link
                    href="/auth/login"
                    className="mt-6 inline-flex rounded-lg bg-cef-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cef-primary/80"
                >
                    Volver al login
                </Link>
            </div>
        );
    }

    return (
        <div className="glass-modal overflow-hidden rounded-2xl">
            <div className="border-b border-slate-200 bg-white px-6 py-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cef-primary text-white shadow-sm">
                            <Activity size={21} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">Ficha medica</h1>
                            <p className="mt-1 text-sm text-slate-500">Al guardarla se activa tu cuenta y se inicia sesion.</p>
                        </div>
                    </div>
                    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-cef-primary/20 bg-cef-primary/10 px-3 py-1 text-xs font-semibold text-cef-primary">
                        <CheckCircle2 size={14} />
                        Ultimo paso
                    </span>
                </div>
            </div>

            <form action={formAction} className="space-y-5 bg-slate-50/70 p-4 sm:p-6">
                <input type="hidden" name="token" value={token} />

                {state.error && (
                    <div className="rounded-lg border border-cef-danger/20 bg-cef-danger/10 p-3 text-sm text-cef-danger">
                        {state.error}
                    </div>
                )}

                <section className={sectionCls}>
                    <SectionHeader icon={<Ambulance size={18} />} title="Contacto de emergencia" />
                    <div className={sectionBodyCls}>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className={labelCls}>Nombre</label>
                                <input name="emergency_name" required className={inputCls} defaultValue={values?.emergency_name || ""} />
                            </div>
                            <div>
                                <label className={labelCls}>Relación</label>
                                <input name="emergency_relationship" required className={inputCls} defaultValue={values?.emergency_relationship || ""} />
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>Teléfono</label>
                            <input name="emergency_phone" required className={inputCls} defaultValue={values?.emergency_phone || ""} />
                        </div>
                    </div>
                </section>

                <section className={sectionCls}>
                    <SectionHeader icon={<HeartPulse size={18} />} title="Antecedentes médicos" />
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
                        {selectedConditions.includes("Otros") && (
                            <div>
                                <label className={labelCls}>Especifique/Otros</label>
                                <textarea name="medical_other" required rows={3} className={inputCls} defaultValue={values?.medical_other || ""} />
                            </div>
                        )}
                    </div>
                </section>

                <section className={sectionCls}>
                    <SectionHeader icon={<Stethoscope size={18} />} title="Información adicional de salud" />
                    <div className={sectionBodyCls}>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className={labelCls}>Hábitos: ¿Fuma o ha fumado?</label>
                                <YesNoGroup name="smoked" value={values?.smoked} />
                            </div>
                            <div>
                                <label className={labelCls}>¿Consume alcohol?</label>
                                <YesNoGroup name="alcohol" value={values?.alcohol} />
                            </div>
                            <div>
                                <label className={labelCls}>Síntomas recientes: ¿Sufre de mareos, falta de aire o dolor de pecho?</label>
                                <YesNoGroup name="recent_symptoms" value={values?.recent_symptoms} />
                            </div>
                            <div>
                                <label className={labelCls}>Descanso: Horas de sueño promedio</label>
                                <input name="sleep_hours" required className={inputCls} inputMode="numeric" defaultValue={values?.sleep_hours || ""} />
                            </div>
                            <div>
                                <label className={labelCls}>¿Dificultad para dormir?</label>
                                <YesNoGroup name="sleep_difficulty" value={values?.sleep_difficulty} />
                            </div>
                            <div>
                                <label className={labelCls}>Nutrición: ¿Sigue alguna dieta especial o suplementación?</label>
                                <input name="diet_supplements" required className={inputCls} placeholder="No / detalle" defaultValue={values?.diet_supplements || ""} />
                            </div>
                        </div>
                    </div>
                </section>

                <section className={sectionCls}>
                    <SectionHeader icon={<ClipboardList size={18} />} title="Historial de cirugías" />
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
                                        <input name="surgery_description" className={inputCls} defaultValue={values?.surgeries?.[index]?.description || ""} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Fecha</label>
                                        <input name="surgery_date" type="date" className={inputCls} defaultValue={values?.surgeries?.[index]?.date || ""} />
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <label className={labelCls}>Complicaciones/Secuelas</label>
                                    <textarea name="surgery_complications" rows={3} className={inputCls} defaultValue={values?.surgeries?.[index]?.complications || ""} />
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
                    <SectionHeader icon={<Pill size={18} />} title="Alergias y medicación" />
                    <div className={sectionBodyCls}>
                        <p className="text-sm text-slate-500">
                            Indicá alergias conocidas y medicación actual con nombre y dosis. Si no tenés, podés dejarlo vacío.
                        </p>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className={labelCls}>Alergias (Medicamentos/Alimentos/Otros)</label>
                                <textarea name="allergies" rows={3} className={inputCls} defaultValue={values?.allergies || ""} />
                            </div>
                            <div>
                                <label className={labelCls}>Medicación actual (Nombre y dosis)</label>
                                <textarea name="current_medication" rows={3} className={inputCls} defaultValue={values?.current_medication || ""} />
                            </div>
                        </div>
                    </div>
                </section>

                <section className={sectionCls}>
                    <SectionHeader icon={<Dumbbell size={18} />} title="Actividad física y objetivos" />
                    <div className={sectionBodyCls}>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className={labelCls}>¿Realiza actividad física actualmente?</label>
                                <YesNoGroup name="physical_activity" value={values?.physical_activity} />
                            </div>
                            <div>
                                <label className={labelCls}>¿Frecuencia?</label>
                                <input name="activity_frequency" className={inputCls} defaultValue={values?.activity_frequency || ""} />
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>Objetivo principal</label>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {goals.map((goal) => (
                                    <label key={goal} className={optionCls}>
                                        <input name="goals" type="checkbox" value={goal} defaultChecked={values?.goals?.includes(goal)} />
                                        <span>{goal}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section className={sectionCls}>
                    <SectionHeader icon={<ShieldCheck size={18} />} title="Consentimiento y declaración jurada" />
                    <div className={sectionBodyCls}>
                        <label className="flex items-start gap-3 rounded-lg border border-cef-primary/20 bg-cef-primary/5 p-4 text-sm text-slate-600 transition-colors hover:border-cef-primary/30">
                            <input name="consent" type="checkbox" required className="mt-1 accent-cef-primary" defaultChecked={values?.consent} />
                            <span>
                                Declaro que la información proporcionada es verdadera y completa. Me comprometo a informar
                                cualquier cambio en mi estado de salud y asumo la responsabilidad de realizar actividad física bajo
                                mi propio riesgo.
                            </span>
                        </label>
                    </div>
                </section>

                <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex w-full items-center justify-center rounded-lg bg-cef-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cef-primary/80 disabled:opacity-60"
                >
                    {isPending ? <Loader2 className="mr-2 animate-spin" size={16} /> : null}
                    Finalizar registro
                </button>
            </form>
        </div>
    );
}
