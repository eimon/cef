"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { updateSala, SalaFormState } from "@/actions/salas";
import { X, Loader2 } from "lucide-react";
import { useActionState } from "react";
import { Sala } from "@/types/api";
import { useToast } from "@/context/ToastContext";

interface EditSalaDialogProps {
    sala: Sala;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const inputCls = "w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 focus:border-cef-primary/60 focus:ring-2 focus:ring-cef-primary/15 outline-none transition-all text-sm";
const labelCls = "block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider";

function getInitialFields(sala: Sala) {
    return {
        nombre: sala.nombre ?? "",
        capacidad: sala.capacidad !== null ? String(sala.capacidad) : "",
    };
}

export default function EditSalaDialog({ sala, isOpen, onClose, onSuccess }: EditSalaDialogProps) {
    const { showSuccess } = useToast();
    const [fields, setFields] = useState(() => getInitialFields(sala));
    const initialState: SalaFormState = {};
    const updateSalaWithId = updateSala.bind(null, sala.id);
    const [state, formAction, isPending] = useActionState(updateSalaWithId, initialState);

    const set = (key: keyof typeof fields) =>
        (event: ChangeEvent<HTMLInputElement>) =>
            setFields((current) => ({ ...current, [key]: event.target.value }));

    const canSubmit = fields.nombre.trim().length > 0;

    useEffect(() => {
        if (!isOpen) return;
        setFields(getInitialFields(sala));
    }, [isOpen, sala]);

    useEffect(() => {
        if (state.success && isOpen) {
            showSuccess("Sala actualizada correctamente");
            onClose();
            onSuccess();
        }
    }, [state.success, isOpen, onClose, showSuccess, onSuccess]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="glass-modal rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h3 className="text-base font-semibold text-slate-800">Editar Sala</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form action={formAction} className="p-6 space-y-4">
                    {state?.error && (
                        <div className="bg-cef-danger/10 border border-cef-danger/20 text-cef-danger p-3 rounded-lg text-sm">
                            {state.error}
                        </div>
                    )}

                    <div>
                        <label className={labelCls}>Nombre</label>
                        <input
                            name="nombre"
                            type="text"
                            required
                            value={fields.nombre}
                            onChange={set("nombre")}
                            className={inputCls}
                        />
                    </div>

                    <div>
                        <label className={labelCls}>Cupo Máximo</label>
                        <input
                            name="capacidad"
                            type="number"
                            min={1}
                            required
                            value={fields.capacidad}
                            onChange={set("capacidad")}
                            className={inputCls}
                        />
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
                            Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
