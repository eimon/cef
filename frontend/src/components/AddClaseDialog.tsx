"use client";

import { useState, useEffect, useActionState, ChangeEvent } from "react";
import { X, Loader2 } from "lucide-react";
import { createClase, ClaseFormState } from "@/actions/clases";
import { getSalas } from "@/actions/salas";
import { getProfesores } from "@/actions/profesores";
import { Sala, Profesor } from "@/types/api";
import { useToast } from "@/context/ToastContext";
import { useRouter } from "next/navigation";

const inputCls = "w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 focus:border-cef-primary/60 focus:ring-2 focus:ring-cef-primary/15 outline-none transition-all text-sm";
const labelCls = "block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider";

const disciplinas = ["yoga", "pilates", "funcional"];
const horasDisponibles = Array.from({ length: 15 }, (_, i) => `${String(i + 7).padStart(2, "0")}:00`);

function sumarUnaHora(hora: string): string {
    const [h] = hora.split(":").map(Number);
    return `${String(h + 1).padStart(2, "0")}:00`;
}

const emptyFields = {
    disciplina: "",
    fecha: "",
    hora_inicio: "",
    sala_id: "",
    profesor_id: "",
    precio_suscripcion: "",
    precio_individual: "",
};

export default function AddClaseDialog() {
    const router = useRouter();
    const { showSuccess } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [salas, setSalas] = useState<Sala[]>([]);
    const [profesores, setProfesores] = useState<Profesor[]>([]);
    const [isLoadingOptions, setIsLoadingOptions] = useState(false);
    const [fields, setFields] = useState(emptyFields);

    const initialState: ClaseFormState = {};
    const [state, formAction, isPending] = useActionState(createClase, initialState);

    const set = (k: keyof typeof emptyFields) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setFields((f: typeof emptyFields) => ({ ...f, [k]: e.target.value }));

    useEffect(() => {
        if (!isOpen) return;
        setIsLoadingOptions(true);
        Promise.all([getSalas(), getProfesores()]).then(([s, p]) => {
            setSalas(s);
            setProfesores(p);
            setIsLoadingOptions(false);
        });
    }, [isOpen]);

    useEffect(() => {
        if (state.success) {
            showSuccess("Clase creada correctamente");
            setIsOpen(false);
            setFields(emptyFields);
            router.refresh();
        }
    }, [state.success, showSuccess, router]);

    const handleClose = () => {
        setIsOpen(false);
        setFields(emptyFields);
    };

    const horaFin = fields.hora_inicio ? sumarUnaHora(fields.hora_inicio) : "--:--";

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-cef-primary hover:bg-cef-primary/80 text-white rounded-lg transition-colors text-sm font-medium"
            >
                + Nueva Clase
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="glass-modal rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h3 className="text-base font-semibold text-slate-800">Agregar Clase</h3>
                            <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6">
                            {isLoadingOptions ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="animate-spin text-slate-400" size={24} />
                                </div>
                            ) : (
                                <form action={formAction} className="space-y-4">
                                    {state?.error && (
                                        <div className="bg-cef-danger/10 border border-cef-danger/20 text-cef-danger p-3 rounded-lg text-sm">
                                            {state.error}
                                        </div>
                                    )}

                                    <div>
                                        <label className={labelCls}>Disciplina</label>
                                        <select name="disciplina" required value={fields.disciplina} onChange={set("disciplina")} className={inputCls}>
                                            <option value="">Seleccionar...</option>
                                            {disciplinas.map((d) => (
                                                <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className={labelCls}>Fecha</label>
                                        <input name="fecha" type="date" required value={fields.fecha} onChange={set("fecha")} className={inputCls} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelCls}>Hora inicio</label>
                                            <select name="hora_inicio" required value={fields.hora_inicio} onChange={set("hora_inicio")} className={inputCls}>
                                                <option value="">--:--</option>
                                                {horasDisponibles.map((h) => (
                                                    <option key={h} value={h}>{h}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelCls}>Hora fin</label>
                                            <input
                                                name="hora_fin"
                                                type="text"
                                                readOnly
                                                value={horaFin}
                                                className={`${inputCls} bg-slate-100 text-slate-400 cursor-default`}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className={labelCls}>Sala</label>
                                        <select name="sala_id" required value={fields.sala_id} onChange={set("sala_id")} className={inputCls}>
                                            <option value="">Seleccionar...</option>
                                            {salas.map((s) => (
                                                <option key={s.id} value={s.id}>{s.nombre}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className={labelCls}>Profesor</label>
                                        <select name="profesor_id" required value={fields.profesor_id} onChange={set("profesor_id")} className={inputCls}>
                                            <option value="">Seleccionar...</option>
                                            {profesores.map((p) => (
                                                <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelCls}>Precio mensualidad</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">$</span>
                                                <input
                                                    name="precio_suscripcion"
                                                    type="number"
                                                    step="0.01"
                                                    required
                                                    value={fields.precio_suscripcion}
                                                    onChange={set("precio_suscripcion")}
                                                    className={inputCls + " pl-7"}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className={labelCls}>Precio individual</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">$</span>
                                                <input
                                                    name="precio_individual"
                                                    type="number"
                                                    step="0.01"
                                                    required
                                                    value={fields.precio_individual}
                                                    onChange={set("precio_individual")}
                                                    className={inputCls + " pl-7"}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-2 flex justify-end space-x-3">
                                        <button
                                            type="button"
                                            onClick={handleClose}
                                            className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isPending}
                                            className="px-4 py-2 bg-cef-primary hover:bg-cef-primary/80 text-white rounded-lg disabled:opacity-60 flex items-center text-sm font-medium transition-colors"
                                        >
                                            {isPending ? <Loader2 className="animate-spin mr-2" size={15} /> : null}
                                            Agregar
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
