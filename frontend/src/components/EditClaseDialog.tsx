"use client";

import { ChangeEvent, FormEvent, useReducer, useEffect, useRef, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { updateClase } from "@/actions/clases";
import { getSalas } from "@/actions/salas";
import { getProfesores } from "@/actions/profesores";
import { getDisciplinas } from "@/actions/disciplinas";
import { ClaseSemana, Sala, Profesor, DisciplinaItem } from "@/types/api";
import { useToast } from "@/context/ToastContext";
import { useRouter } from "next/navigation";

const inputCls = "w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 focus:border-cef-primary/60 focus:ring-2 focus:ring-cef-primary/15 outline-none transition-all text-sm";
const labelCls = "block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider";

const diasSemana = [
    { value: "lunes", label: "Lun" },
    { value: "martes", label: "Mar" },
    { value: "miercoles", label: "Mié" },
    { value: "jueves", label: "Jue" },
    { value: "viernes", label: "Vie" },
    { value: "sabado", label: "Sáb" },
];
const horasDisponibles = Array.from({ length: 15 }, (_, i) => {
    const hora = String(i + 7).padStart(2, "0");
    return `${hora}:00`;
});

function sumarUnaHora(hora: string): string {
    const [h] = hora.split(":").map(Number);
    return `${String(h + 1).padStart(2, "0")}:00`;
}

type State = {
    salas: Sala[];
    profesores: Profesor[];
    disciplinas: DisciplinaItem[];
    isLoadingOptions: boolean;
    disciplina: string;
    horaInicio: string;
    diaSemana: string;
    capacidadMaxima: string;
    salaId: string;
    profesorId: string;
};

type Action =
    | { type: "OPEN"; clase: ClaseSemana }
    | { type: "SET_OPTIONS"; salas: Sala[]; profesores: Profesor[]; disciplinas: DisciplinaItem[] }
    | { type: "SET_FIELD"; key: "disciplina" | "capacidadMaxima" | "salaId" | "profesorId"; value: string }
    | { type: "SET_HORA"; value: string }
    | { type: "SET_DIA"; value: string };

function reducer(state: State, action: Action): State {
    switch (action.type) {
        case "OPEN":
            return {
                ...state,
                isLoadingOptions: true,
                disciplina: String(action.clase.disciplina || ""),
                horaInicio: action.clase.hora_inicio.slice(0, 5),
                diaSemana: action.clase.dia_semana,
                capacidadMaxima: String(action.clase.capacidad_maxima ?? ""),
                salaId: action.clase.sala_id ?? "",
                profesorId: action.clase.profesor_id ?? "",
            };
        case "SET_OPTIONS":
            return { ...state, salas: action.salas, profesores: action.profesores, disciplinas: action.disciplinas, isLoadingOptions: false };
        case "SET_FIELD":
            return { ...state, [action.key]: action.value };
        case "SET_HORA":
            return { ...state, horaInicio: action.value };
        case "SET_DIA":
            return { ...state, diaSemana: action.value };
    }
}

interface EditClaseDialogProps {
    clase: ClaseSemana;
    isOpen: boolean;
    onClose: () => void;
}

export default function EditClaseDialog({ clase, isOpen, onClose }: EditClaseDialogProps) {
    const { refresh } = useRouter();
    const { showSuccess } = useToast();
    const initializedClaseId = useRef<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPending, setIsPending] = useState(false);
    const [ui, dispatch] = useReducer(reducer, {
        salas: [],
        profesores: [],
        disciplinas: [],
        isLoadingOptions: false,
        disciplina: String(clase.disciplina || ""),
        horaInicio: clase.hora_inicio.slice(0, 5),
        diaSemana: clase.dia_semana,
        capacidadMaxima: String(clase.capacidad_maxima ?? ""),
        salaId: clase.sala_id ?? "",
        profesorId: clase.profesor_id ?? "",
    });

    useEffect(() => {
        if (!isOpen) return;
        if (initializedClaseId.current !== clase.id) {
            initializedClaseId.current = clase.id;
            setError(null);
            dispatch({ type: "OPEN", clase });
        }
        Promise.all([getSalas(), getProfesores(), getDisciplinas()]).then(([salas, profesores, disciplinas]) => {
            dispatch({ type: "SET_OPTIONS", salas, profesores, disciplinas });
        });
    }, [isOpen, clase]);

    const selectedSala = ui.salas.find((s) => s.id === ui.salaId) ?? null;
    const salaCapacidad = selectedSala?.capacidad ?? null;

    const setField = (key: "disciplina" | "capacidadMaxima" | "salaId" | "profesorId") =>
        (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
            const value = event.target.value;
            if (key === "salaId") {
                const sala = ui.salas.find((s) => s.id === value);
                const cap = sala?.capacidad ?? null;
                dispatch({ type: "SET_FIELD", key, value });
                if (cap !== null && Number(ui.capacidadMaxima) > cap) {
                    dispatch({ type: "SET_FIELD", key: "capacidadMaxima", value: String(cap) });
                }
                return;
            }
            dispatch({ type: "SET_FIELD", key, value });
        };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setIsPending(true);

        const result = await updateClase(clase.id, {}, new FormData(event.currentTarget));
        setIsPending(false);

        if (result.error) {
            setError(result.error);
            return;
        }

        showSuccess("Clase editada correctamente");
        onClose();
        refresh();
    };

    const capacidadNum = Number(ui.capacidadMaxima);
    const canSubmit =
        ui.disciplina.trim().length > 0 &&
        ui.diaSemana.trim().length > 0 &&
        ui.horaInicio.trim().length > 0 &&
        capacidadNum > 0 &&
        (salaCapacidad === null || capacidadNum <= salaCapacidad) &&
        ui.salaId.trim().length > 0 &&
        ui.profesorId.trim().length > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="glass-modal rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h3 className="text-base font-semibold text-slate-800">Editar Clase</h3>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6">
                    {ui.isLoadingOptions ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="animate-spin text-slate-400" size={24} />
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="bg-cef-danger/10 border border-cef-danger/20 text-cef-danger p-3 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label htmlFor="edit-disciplina" className={labelCls}>Disciplina</label>
                                <select
                                    id="edit-disciplina"
                                    name="disciplina"
                                    required
                                    value={ui.disciplina}
                                    onChange={setField("disciplina")}
                                    className={inputCls}
                                >
                                    <option value="">Seleccionar…</option>
                                    {ui.disciplinas.map((d) => (
                                        <option key={d.id} value={d.nombre}>
                                            {d.nombre.charAt(0).toUpperCase() + d.nombre.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className={labelCls}>Día de la semana</label>
                                <input type="hidden" name="dia_semana" value={ui.diaSemana} />
                                <div className="grid grid-cols-6 gap-1.5">
                                    {diasSemana.map((dia) => (
                                        <div
                                            key={dia.value}
                                            className={`py-2 rounded-lg text-xs font-medium text-center cursor-default ${
                                                ui.diaSemana === dia.value
                                                    ? "bg-cef-primary/30 text-cef-primary"
                                                    : "bg-slate-100 text-slate-400"
                                            }`}
                                        >
                                            {dia.label}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>Hora inicio</label>
                                    <input
                                        name="hora_inicio"
                                        type="text"
                                        readOnly
                                        value={ui.horaInicio}
                                        className={`${inputCls} bg-slate-100 text-slate-400 cursor-default`}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Hora fin</label>
                                    <input
                                        name="hora_fin"
                                        type="text"
                                        readOnly
                                        value={sumarUnaHora(ui.horaInicio)}
                                        className={`${inputCls} bg-slate-100 text-slate-400 cursor-default`}
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="edit-capacidad" className={labelCls}>Cupo máximo</label>
                                <input
                                    id="edit-capacidad"
                                    name="capacidad_maxima"
                                    type="number"
                                    min={1}
                                    max={salaCapacidad ?? undefined}
                                    required
                                    value={ui.capacidadMaxima}
                                    onChange={setField("capacidadMaxima")}
                                    className={inputCls}
                                    placeholder={salaCapacidad ? `Máx. ${salaCapacidad}` : undefined}
                                />
                                {salaCapacidad !== null && (
                                    <p className="mt-1 text-xs text-slate-400">Capacidad de la sala: {salaCapacidad}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="edit-sala" className={labelCls}>Sala</label>
                                <select id="edit-sala" name="sala_id" required value={ui.salaId} onChange={setField("salaId")} className={inputCls}>
                                    <option value="">Seleccionar…</option>
                                    {ui.salas.map((sala) => (
                                        <option key={sala.id} value={sala.id}>{sala.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="edit-profesor" className={labelCls}>Profesor</label>
                                <select id="edit-profesor" name="profesor_id" required value={ui.profesorId} onChange={setField("profesorId")} className={inputCls}>
                                    <option value="">Seleccionar…</option>
                                    {ui.profesores.map((profesor) => (
                                        <option key={profesor.id} value={profesor.id}>
                                            {profesor.nombre} {profesor.apellido}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPending || !canSubmit}
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
