"use client";

import { useState, useEffect, useActionState, ChangeEvent } from "react";
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

const horasDisponibles = Array.from({ length: 15 }, (_, i) => {
    const h = String(i + 7).padStart(2, "0");
    return `${h}:00`;
});

function sumarUnaHora(hora: string): string {
    const [h] = hora.split(":").map(Number);
    return `${String(h + 1).padStart(2, "0")}:00`;
}

function formatIsoToDateInput(value: string): string {
    const [year, month, day] = value.split("-");
    return year && month && day ? `${day}/${month}/${year}` : "";
}

function formatDateInput(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length > 4) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
}

function toIsoDate(value: string): string {
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return "";

    const [, day, month, year] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    const isValid =
        date.getFullYear() === Number(year) &&
        date.getMonth() === Number(month) - 1 &&
        date.getDate() === Number(day);

    return isValid ? `${year}-${month}-${day}` : "";
}

function getTodayIso(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getDateError(value: string): string {
    if (!value) return "";
    if (value.length < 10) return "";

    const isoDate = toIsoDate(value);
    if (!isoDate || isoDate < getTodayIso()) return "Seleccione una fecha valida";

    return "";
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
    const [isLoadingOptions, setIsLoadingOptions] = useState(true);
    const [horaInicio, setHoraInicio] = useState(clase.hora_inicio.slice(0, 5));
    const [fecha, setFecha] = useState(formatIsoToDateInput(clase.fecha_en_semana));
    const [disciplina, setDisciplina] = useState(String(clase.disciplina || ""));
    const [salaId, setSalaId] = useState(clase.sala_id ?? "");
    const [profesorId, setProfesorId] = useState(clase.profesor_id ?? "");

    const initialState: ClaseFormState = {};
    const updateClaseWithId = updateClase.bind(null, clase.id);
    const [state, formAction, isPending] = useActionState(updateClaseWithId, initialState);

    useEffect(() => {
        if (!isOpen) return;
        Promise.all([getSalas(), getProfesores()]).then(([s, p]) => {
            setSalas(s);
            setProfesores(p);
            setIsLoadingOptions(false);
        });
    }, [isOpen]);

    const handleDateChange = (event: ChangeEvent<HTMLInputElement>) => {
        setFecha(formatDateInput(event.target.value));
    };

    const isoFecha = toIsoDate(fecha);
    const dateError = getDateError(fecha);
    const canSubmit =
        disciplina.trim().length > 0 &&
        isoFecha.length > 0 &&
        !dateError &&
        horaInicio.trim().length > 0 &&
        salaId.trim().length > 0 &&
        profesorId.trim().length > 0;

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
                                <select
                                    name="disciplina"
                                    required
                                    value={disciplina}
                                    onChange={(event) => setDisciplina(event.target.value)}
                                    className={inputCls}
                                >
                                    {disciplinas.map((d) => (
                                        <option key={d} value={d}>
                                            {d.charAt(0).toUpperCase() + d.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className={labelCls}>Fecha</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={10}
                                    required
                                    pattern="\d{2}/\d{2}/\d{4}"
                                    placeholder="DD/MM/AAAA"
                                    value={fecha}
                                    onChange={handleDateChange}
                                    aria-invalid={Boolean(dateError)}
                                    className={inputCls}
                                />
                                <input type="hidden" name="fecha" value={isoFecha} />
                                {dateError && <p className="mt-1.5 text-xs text-cef-danger">{dateError}</p>}
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
                                <label className={labelCls}>Sala</label>
                                <select
                                    name="sala_id"
                                    required
                                    value={salaId}
                                    onChange={(event) => setSalaId(event.target.value)}
                                    className={inputCls}
                                >
                                    <option value="">Seleccionar...</option>
                                    {salas.map((s) => (
                                        <option key={s.id} value={s.id}>{s.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className={labelCls}>Profesor</label>
                                <select
                                    name="profesor_id"
                                    required
                                    value={profesorId}
                                    onChange={(event) => setProfesorId(event.target.value)}
                                    className={inputCls}
                                >
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
