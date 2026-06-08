"use client";

import { type Dispatch, type ChangeEvent, type FormEvent, useEffect, useReducer, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { createClase } from "@/actions/clases";
import { getSalas } from "@/actions/salas";
import { getProfesores } from "@/actions/profesores";
import { type Sala, type Profesor } from "@/types/api";
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
const horasDisponibles = Array.from({ length: 15 }, (_, i) => `${String(i + 7).padStart(2, "0")}:00`);

function sumarUnaHora(hora: string): string {
    const [h] = hora.split(":").map(Number);
    return `${String(h + 1).padStart(2, "0")}:00`;
}

type ClaseFields = {
    disciplina: string;
    hora_inicio: string;
    sala_id: string;
    profesor_id: string;
    capacidad_maxima: string;
};

type State = {
    isOpen: boolean;
    salas: Sala[];
    profesores: Profesor[];
    isLoadingOptions: boolean;
    fields: ClaseFields;
    diaSemana: string;
};

type Action =
    | { type: "OPEN" }
    | { type: "CLOSE" }
    | { type: "SET_OPTIONS"; salas: Sala[]; profesores: Profesor[] }
    | { type: "SET_FIELD"; key: keyof ClaseFields; value: string }
    | { type: "SET_DIA"; value: string };

const emptyFields: ClaseFields = {
    disciplina: "",
    hora_inicio: "",
    sala_id: "",
    profesor_id: "",
    capacidad_maxima: "",
};

const initialState: State = {
    isOpen: false,
    salas: [],
    profesores: [],
    isLoadingOptions: false,
    fields: emptyFields,
    diaSemana: "",
};

function reducer(state: State, action: Action): State {
    switch (action.type) {
        case "OPEN":
            return { ...state, isOpen: true, isLoadingOptions: true };
        case "CLOSE":
            return { ...initialState };
        case "SET_OPTIONS":
            return { ...state, salas: action.salas, profesores: action.profesores, isLoadingOptions: false };
        case "SET_FIELD":
            return { ...state, fields: { ...state.fields, [action.key]: action.value } };
        case "SET_DIA":
            return { ...state, diaSemana: action.value };
    }
}

export default function AddClaseDialog() {
    const [ui, dispatch] = useReducer(reducer, initialState);

    useEffect(() => {
        if (!ui.isOpen) return;
        Promise.all([getSalas(), getProfesores()]).then(([salas, profesores]) => {
            dispatch({ type: "SET_OPTIONS", salas, profesores });
        });
    }, [ui.isOpen]);

    const selectedSala = ui.salas.find((s) => s.id === ui.fields.sala_id) ?? null;
    const salaCapacidad = selectedSala?.capacidad ?? null;

    const set = (key: keyof ClaseFields) =>
        (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
            let value = event.target.value;
            if (key === "sala_id") {
                const sala = ui.salas.find((s) => s.id === value);
                const cap = sala?.capacidad ?? null;
                dispatch({ type: "SET_FIELD", key, value });
                if (cap !== null && Number(ui.fields.capacidad_maxima) > cap) {
                    dispatch({ type: "SET_FIELD", key: "capacidad_maxima", value: String(cap) });
                }
                return;
            }
            dispatch({ type: "SET_FIELD", key, value });
        };

    const horaFin = ui.fields.hora_inicio ? sumarUnaHora(ui.fields.hora_inicio) : "--:--";
    const capacidadNum = Number(ui.fields.capacidad_maxima);
    const canSubmit =
        ui.fields.disciplina.trim().length > 0 &&
        ui.diaSemana.trim().length > 0 &&
        ui.fields.hora_inicio.trim().length > 0 &&
        ui.fields.sala_id.trim().length > 0 &&
        ui.fields.profesor_id.trim().length > 0 &&
        capacidadNum > 0 &&
        (salaCapacidad === null || capacidadNum <= salaCapacidad);

    return (
        <>
            <button
                type="button"
                onClick={() => dispatch({ type: "OPEN" })}
                className="inline-flex items-center px-4 py-2 bg-cef-primary hover:bg-cef-primary/80 text-white rounded-lg transition-colors text-sm font-medium"
            >
                + Nueva Clase
            </button>

            {ui.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="glass-modal rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h3 className="text-base font-semibold text-slate-800">Agregar Clase</h3>
                            <button type="button" onClick={() => dispatch({ type: "CLOSE" })} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6">
                            {ui.isLoadingOptions ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="animate-spin text-slate-400" size={24} />
                                </div>
                            ) : (
                                <AddClaseForm
                                    ui={ui}
                                    canSubmit={canSubmit}
                                    horaFin={horaFin}
                                    salaCapacidad={salaCapacidad}
                                    set={set}
                                    dispatch={dispatch}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function AddClaseForm({
    ui,
    canSubmit,
    horaFin,
    salaCapacidad,
    set,
    dispatch,
}: {
    ui: State;
    canSubmit: boolean;
    horaFin: string;
    salaCapacidad: number | null;
    set: (key: keyof ClaseFields) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    dispatch: Dispatch<Action>;
}) {
    const { refresh } = useRouter();
    const { showSuccess } = useToast();
    const [error, setError] = useState<string | null>(null);
    const [isPending, setIsPending] = useState(false);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setIsPending(true);

        const result = await createClase({}, new FormData(event.currentTarget));
        setIsPending(false);

        if (result.error) {
            setError(result.error);
            return;
        }

        showSuccess("Clase creada correctamente");
        dispatch({ type: "CLOSE" });
        refresh();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="bg-cef-danger/10 border border-cef-danger/20 text-cef-danger p-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            <div>
                <label htmlFor="add-disciplina" className={labelCls}>Disciplina</label>
                <select id="add-disciplina" name="disciplina" required value={ui.fields.disciplina} onChange={set("disciplina")} className={inputCls}>
                    <option value="">Seleccionar…</option>
                    {disciplinas.map((disciplina) => (
                        <option key={disciplina} value={disciplina}>{disciplina.charAt(0).toUpperCase() + disciplina.slice(1)}</option>
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
                    <label htmlFor="add-hora-inicio" className={labelCls}>Hora inicio</label>
                    <select id="add-hora-inicio" name="hora_inicio" required value={ui.fields.hora_inicio} onChange={set("hora_inicio")} className={inputCls}>
                        <option value="">--:--</option>
                        {horasDisponibles.map((hora) => (
                            <option key={hora} value={hora}>{hora}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="add-hora-fin" className={labelCls}>Hora fin</label>
                    <input
                        id="add-hora-fin"
                        name="hora_fin"
                        type="text"
                        readOnly
                        value={horaFin}
                        className={`${inputCls} bg-slate-100 text-slate-400 cursor-default`}
                    />
                </div>
            </div>

            <div>
                <label htmlFor="add-capacidad" className={labelCls}>Cupo máximo</label>
                <input
                    id="add-capacidad"
                    name="capacidad_maxima"
                    type="number"
                    min={1}
                    max={salaCapacidad ?? undefined}
                    required
                    value={ui.fields.capacidad_maxima}
                    onChange={set("capacidad_maxima")}
                    className={inputCls}
                    placeholder={salaCapacidad ? `Máx. ${salaCapacidad}` : "Ej: 15"}
                />
                {salaCapacidad !== null && (
                    <p className="mt-1 text-xs text-slate-400">Capacidad de la sala: {salaCapacidad}</p>
                )}
            </div>

            <div>
                <label htmlFor="add-sala" className={labelCls}>Sala</label>
                <select id="add-sala" name="sala_id" required value={ui.fields.sala_id} onChange={set("sala_id")} className={inputCls}>
                    <option value="">Seleccionar…</option>
                    {ui.salas.map((sala) => (
                        <option key={sala.id} value={sala.id}>{sala.nombre}</option>
                    ))}
                </select>
            </div>

            <div>
                <label htmlFor="add-profesor" className={labelCls}>Profesor</label>
                <select id="add-profesor" name="profesor_id" required value={ui.fields.profesor_id} onChange={set("profesor_id")} className={inputCls}>
                    <option value="">Seleccionar…</option>
                    {ui.profesores.map((profesor) => (
                        <option key={profesor.id} value={profesor.id}>{profesor.nombre} {profesor.apellido}</option>
                    ))}
                </select>
            </div>

            <div className="pt-2 flex justify-end gap-3">
                <button
                    type="button"
                    onClick={() => dispatch({ type: "CLOSE" })}
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
                    Agregar
                </button>
            </div>
        </form>
    );
}
