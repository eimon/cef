"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { updateDisciplinaAdmin, DisciplinaFormState } from "@/actions/disciplinas";
import { X, Loader2 } from "lucide-react";
import { useActionState } from "react";
import { DisciplinaItem } from "@/types/api";
import { useToast } from "@/context/ToastContext";

interface EditDisciplinaAdminDialogProps {
    disciplina: DisciplinaItem;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const inputCls = "w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 focus:border-cef-primary/60 focus:ring-2 focus:ring-cef-primary/15 outline-none transition-all text-sm";
const labelCls = "block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider";

function getInitialFields(disciplina: DisciplinaItem) {
    return {
        nombre: disciplina.nombre ?? "",
        precio_individual: String(disciplina.precio_individual ?? ""),
        precio_suscripcion: String(disciplina.precio_suscripcion ?? ""),
    };
}

export default function EditDisciplinaAdminDialog({ disciplina, isOpen, onClose, onSuccess }: EditDisciplinaAdminDialogProps) {
    const { showSuccess } = useToast();
    const [fields, setFields] = useState(() => getInitialFields(disciplina));
    const initialState: DisciplinaFormState = {};
    const updateWithId = updateDisciplinaAdmin.bind(null, disciplina.id);
    const [state, formAction, isPending] = useActionState(updateWithId, initialState);

    const set = (key: keyof typeof fields) =>
        (event: ChangeEvent<HTMLInputElement>) =>
            setFields((current) => ({ ...current, [key]: event.target.value }));

    const canSubmit =
        fields.nombre.trim().length > 0 &&
        parseFloat(fields.precio_individual) > 0 &&
        parseFloat(fields.precio_suscripcion) > 0;

    useEffect(() => {
        if (!isOpen) return;
        setFields(getInitialFields(disciplina));
    }, [isOpen, disciplina]);

    useEffect(() => {
        if (state.success && isOpen) {
            showSuccess("Disciplina actualizada correctamente");
            onClose();
            onSuccess();
        }
    }, [state.success, isOpen, onClose, showSuccess, onSuccess]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="glass-modal rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h3 className="text-base font-semibold text-slate-800">Editar Disciplina</h3>
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

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>Precio individual</label>
                            <input
                                name="precio_individual"
                                type="number"
                                min="0.01"
                                step="0.01"
                                required
                                value={fields.precio_individual}
                                onChange={set("precio_individual")}
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Precio mensualidad</label>
                            <input
                                name="precio_suscripcion"
                                type="number"
                                min="0.01"
                                step="0.01"
                                required
                                value={fields.precio_suscripcion}
                                onChange={set("precio_suscripcion")}
                                className={inputCls}
                            />
                        </div>
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
