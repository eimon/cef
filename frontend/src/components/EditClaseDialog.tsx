"use client";

import { useState, useEffect, useActionState } from "react";
import { X, Loader2 } from "lucide-react";
import { updateClase, ClaseFormState } from "@/actions/clases";
import { getSalas } from "@/actions/salas";
import { getProfesores } from "@/actions/profesores";
import { ClaseSemana, Sala, Profesor } from "@/types/api";
import { useToast } from "@/context/ToastContext";
import { useRouter } from "next/navigation";

const inputCls = "w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 focus:border-cef-primary/60 focus:ring-2 focus:ring-cef-primary/15 outline-none transition-all text-sm";
const labelCls = "block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider";

const disciplinas = ["yoga", "pilates", "funcional"];
const diasSemana = [
    { value: "lunes",     label: "Lun" },
    { value: "martes",    label: "Mar" },
    { value: "miercoles", label: "Mié" },
    { value: "jueves",    label: "Jue" },
    { value: "viernes",   label: "Vie" },
    { value: "sabado",    label: "Sáb" },
];
const horasDisponibles = Array.from({ length: 15 }, (_, i) => {
    const h = String(i + 7).padStart(2, "0");
    return `${h}:00`;
});

function sumarUnaHora(hora: string): string {
    const [h] = hora.split(":").map(Number);
    return `${String(h + 1).padStart(2, "0")}:00`;
}

interface EditClaseDialogProps {
    clase: ClaseSemana;
    isOpen: boolean;
    onClose: () => void;
}

export default function EditClaseDialog({ clase, isOpen, onClose }: EditClaseDialogProps) {
    const router = useRouter();
    const { showSuccess } = useToast();
    const [salas, setSalas] = useState<Sala[]>([]);
    const [profesores, setProfesores] = useState<Profesor[]>([]);
    const [isLoadingOptions, setIsLoadingOptions] = useState(false);
    const [horaInicio, setHoraInicio] = useState(clase.hora_inicio.slice(0, 5));
    const [diaSemana, setDiaSemana] = useState(clase.dia_semana);

    const initialState: ClaseFormState = {};
    const updateClaseWithId = updateClase.bind(null, clase.id);
    const [state, formAction, isPending] = useActionState(updateClaseWithId, initialState);

    useEffect(() => {
        if (!isOpen) return;
        setHoraInicio(clase.hora_inicio.slice(0, 5));
        setDiaSemana(clase.dia_semana);
        setIsLoadingOptions(true);
        Promise.all([getSalas(), getProfesores()]).then(([s, p]) => {
            setSalas(s);
            setProfesores(p);
            setIsLoadingOptions(false);
        });
    }, [isOpen, clase.hora_inicio, clase.dia_semana]);

    useEffect(() => {
        if (state.success) {
            showSuccess("Clase editada correctamente");
            onClose();
            router.refresh();
        }
    }, [state.success, showSuccess, onClose, router]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="glass-modal rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h3 className="text-base font-semibold text-slate-800">Editar Clase</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
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
                                <select name="disciplina" required defaultValue={clase.disciplina} className={inputCls}>
                                    {disciplinas.map((d) => (
                                        <option key={d} value={d}>
                                            {d.charAt(0).toUpperCase() + d.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className={labelCls}>Día de la semana</label>
                                <input type="hidden" name="dia_semana" value={diaSemana} />
                                <div className="grid grid-cols-6 gap-1.5">
                                    {diasSemana.map((d) => (
                                        <button
                                            key={d.value}
                                            type="button"
                                            onClick={() => setDiaSemana(d.value)}
                                            className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                                                diaSemana === d.value
                                                    ? "bg-cef-primary text-white"
                                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            }`}
                                        >
                                            {d.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>Hora inicio</label>
                                    <select
                                        name="hora_inicio"
                                        required
                                        value={horaInicio}
                                        onChange={(e) => setHoraInicio(e.target.value)}
                                        className={inputCls}
                                    >
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
                                        value={sumarUnaHora(horaInicio)}
                                        className={`${inputCls} bg-slate-100 text-slate-400 cursor-default`}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>Cupo máximo</label>
                                <input
                                    name="capacidad_maxima"
                                    type="number"
                                    min={1}
                                    required
                                    defaultValue={clase.capacidad_maxima}
                                    className={inputCls}
                                />
                            </div>

                            <div>
                                <label className={labelCls}>Sala</label>
                                <select name="sala_id" required defaultValue={clase.sala_id ?? ""} className={inputCls}>
                                    <option value="">Seleccionar...</option>
                                    {salas.map((s) => (
                                        <option key={s.id} value={s.id}>{s.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className={labelCls}>Profesor</label>
                                <select name="profesor_id" required defaultValue={clase.profesor_id ?? ""} className={inputCls}>
                                    <option value="">Seleccionar...</option>
                                    {profesores.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.nombre} {p.apellido}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="pt-2 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={onClose}
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
                                    Editar
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
