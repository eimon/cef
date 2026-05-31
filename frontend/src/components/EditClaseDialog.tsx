"use client";

import { ChangeEvent, FormEvent, useReducer, useEffect, useRef, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { updateClase } from "@/actions/clases";
import { getSalas } from "@/actions/salas";
import { getProfesores } from "@/actions/profesores";
import { ClaseSemana, Sala, Profesor } from "@/types/api";
import { useToast } from "@/context/ToastContext";
import { useRouter } from "next/navigation";

const inputCls = "w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 focus:border-cef-primary/60 focus:ring-2 focus:ring-cef-primary/15 outline-none transition-all text-sm";
const labelCls = "block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider";

const disciplinas = ["yoga", "pilates", "funcional"];
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
    | { type: "SET_OPTIONS"; salas: Sala[]; profesores: Profesor[] }
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
            return { ...state, salas: action.salas, profesores: action.profesores, isLoadingOptions: false };
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
        Promise.all([getSalas(), getProfesores()]).then(([salas, profesores]) => {
            dispatch({ type: "SET_OPTIONS", salas, profesores });
        });
    }, [isOpen, clase]);

    const setField = (key: "disciplina" | "capacidadMaxima" | "salaId" | "profesorId") =>
        (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
            dispatch({ type: "SET_FIELD", key, value: event.target.value });

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

    const canSubmit =
        ui.disciplina.trim().length > 0 &&
        ui.diaSemana.trim().length > 0 &&
        ui.horaInicio.trim().length > 0 &&
        Number(ui.capacidadMaxima) > 0 &&
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
                                    {disciplinas.map((disciplina) => (
                                        <option key={disciplina} value={disciplina}>
                                            {disciplina.charAt(0).toUpperCase() + disciplina.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <fieldset className="border-0 p-0 m-0 min-w-0">
                                <legend className={labelCls}>Día de la semana</legend>
                                <input type="hidden" name="dia_semana" value={ui.diaSemana} />
                                <div className="grid grid-cols-6 gap-1.5">
                                    {diasSemana.map((dia) => (
                                        <button
                                            key={dia.value}
                                            type="button"
                                            onClick={() => dispatch({ type: "SET_DIA", value: dia.value })}
                                            className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                                                ui.diaSemana === dia.value
                                                    ? "bg-cef-primary text-white"
                                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            }`}
                                        >
                                            {dia.label}
                                        </button>
                                    ))}
                                </div>
                            </fieldset>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="edit-hora-inicio" className={labelCls}>Hora inicio</label>
                                    <select
                                        id="edit-hora-inicio"
                                        name="hora_inicio"
                                        required
                                        value={ui.horaInicio}
                                        onChange={(event) => dispatch({ type: "SET_HORA", value: event.target.value })}
                                        className={inputCls}
                                    >
                                        {horasDisponibles.map((hora) => (
                                            <option key={hora} value={hora}>{hora}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="edit-hora-fin" className={labelCls}>Hora fin</label>
                                    <input
                                        id="edit-hora-fin"
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
                                    required
                                    value={ui.capacidadMaxima}
                                    onChange={setField("capacidadMaxima")}
                                    className={inputCls}
                                />
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
