"use client";

import { useActionState, ChangeEvent, useEffect, useState } from "react";
import { useToast } from "@/context/ToastContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Save, X } from "lucide-react";

import {
    updatePersonalData,
    type PersonalDataFormValues,
    type PersonalDataState,
} from "@/actions/profile";
import type { User } from "@/types/api";

const initialState: PersonalDataState = {};
const inputCls = "w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-cef-primary/60 focus:bg-white focus:ring-2 focus:ring-cef-primary/15";
const labelCls = "block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider";

function normalizeDate(value?: string | null): string {
    if (!value) return "";
    const iso = value.split("T")[0];
    const [y, m, d] = iso.split("-");
    if (!y || !m || !d) return "";
    return `${d}/${m}/${y}`;
}

function buildDefaults(profile: User | null): PersonalDataFormValues {
    return {
        dni: profile?.dni || "",
        nombre: profile?.nombre || "",
        apellido: profile?.apellido || "",
        genero: profile?.genero || "",
        telefono: profile?.telefono || "",
        fecha_nacimiento: normalizeDate(profile?.fecha_nacimiento),
    };
}

export default function PersonalDataEditForm({ profile }: { profile: User | null }) {
    const [state, formAction, isPending] = useActionState(updatePersonalData, initialState);
    const values = state.values || buildDefaults(profile);
    const fieldErrors = state.fieldErrors || {};
    const { showSuccess } = useToast();
    const router = useRouter();
    const [dni, setDni] = useState(values.dni || "");
    const [nombre, setNombre] = useState(values.nombre || "");
    const [apellido, setApellido] = useState(values.apellido || "");
    const [genero, setGenero] = useState(values.genero || "");
    const [telefono, setTelefono] = useState(values.telefono || "");
    const [fechaNacimiento, setFechaNacimiento] = useState(values.fecha_nacimiento || "");
    const canSubmit = [dni, nombre, apellido, genero, telefono, fechaNacimiento].every(
        (value) => value.trim().length > 0
    );

    useEffect(() => {
        if (state?.success) {
            showSuccess("Datos actualizados correctamente");
            router.replace("/profile?seccion=datos-personales");
            router.refresh();
        }
    }, [state?.success, showSuccess, router]);

    function handleBirthChange(e: ChangeEvent<HTMLInputElement>) {
        let v = e.currentTarget.value.replace(/\D/g, "");
        if (v.length > 8) v = v.slice(0, 8);
        if (v.length > 4) v = v.slice(0, 2) + "/" + v.slice(2, 4) + "/" + v.slice(4);
        else if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
        setFechaNacimiento(v);
    }

    return (
        <section className="glass rounded-2xl p-6">
            <div className="mb-5 border-b border-slate-200 pb-5">
                <h2 className="text-lg font-bold text-slate-800">Editar datos personales</h2>
                <p className="mt-1 text-sm text-slate-400">El email no se modifica desde este formulario.</p>
            </div>

            <form action={formAction} noValidate className="space-y-5">
                {fieldErrors._form && <p className="text-xs text-cef-danger">{fieldErrors._form}</p>}

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <div>
                        <label className={labelCls}>DNI</label>
                        <input name="dni" required className={inputCls} value={dni} onChange={(event) => setDni(event.target.value)} aria-invalid={Boolean(fieldErrors.dni)} />
                        {fieldErrors.dni && <p className="mt-1.5 text-xs text-cef-danger">{fieldErrors.dni}</p>}
                    </div>
                    <div>
                        <label className={labelCls}>Nombre</label>
                        <input name="nombre" required className={inputCls} value={nombre} onChange={(event) => setNombre(event.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Apellido</label>
                        <input name="apellido" required className={inputCls} value={apellido} onChange={(event) => setApellido(event.target.value)} />
                    </div>
                    <div>
                        <label className={labelCls}>Género</label>
                        <select name="genero" required className={inputCls} value={genero} onChange={(event) => setGenero(event.target.value)}>
                            <option value="" disabled>
                                Seleccionar
                            </option>
                            <option value="Masculino">Masculino</option>
                            <option value="Femenino">Femenino</option>
                            <option value="Otro">Otro</option>
                            <option value="Prefiero no decirlo">Prefiero no decirlo</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Teléfono</label>
                        <input name="telefono" required className={inputCls} value={telefono} onChange={(event) => setTelefono(event.target.value)} aria-invalid={Boolean(fieldErrors.telefono)} />
                        {fieldErrors.telefono && <p className="mt-1.5 text-xs text-cef-danger">{fieldErrors.telefono}</p>}
                    </div>
                    <div>
                        <label className={labelCls}>Fecha de nacimiento</label>
                        <input
                            name="fecha_nacimiento"
                            type="text"
                            inputMode="numeric"
                            maxLength={10}
                            required
                            placeholder="DD/MM/AAAA"
                            className={inputCls}
                            value={fechaNacimiento}
                            onChange={handleBirthChange}
                            aria-invalid={Boolean(fieldErrors.fecha_nacimiento)}
                        />
                        {fieldErrors.fecha_nacimiento && (
                            <p className="mt-1.5 text-xs text-cef-danger">{fieldErrors.fecha_nacimiento}</p>
                        )}
                    </div>
                </div>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <Link
                        href="/profile?seccion=datos-personales"
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                    >
                        <X size={16} />
                        Cancelar
                    </Link>
                    <button
                        type="submit"
                        disabled={isPending || !canSubmit}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-cef-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cef-primary/80 disabled:opacity-60"
                    >
                        {isPending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        Guardar cambios
                    </button>
                </div>
            </form>
        </section>
    );
}
