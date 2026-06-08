"use client";

import { useState, useEffect, useActionState, ChangeEvent } from "react";
import { createSala, SalaFormState } from "@/actions/salas";
import { Plus, X, Loader2 } from "lucide-react";
import { useToast } from "@/context/ToastContext";

const inputCls = "w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 focus:border-cef-primary/60 focus:ring-2 focus:ring-cef-primary/15 outline-none transition-all text-sm";
const labelCls = "block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider";

const emptyFields = { nombre: "", capacidad: "" };

interface AddSalaDialogProps {
    onSuccess: () => void;
}

export default function AddSalaDialog({ onSuccess }: AddSalaDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [fields, setFields] = useState(emptyFields);
    const { showSuccess } = useToast();
    const initialState: SalaFormState = {};
    const [state, formAction, isPending] = useActionState(createSala, initialState);

    const set = (k: keyof typeof emptyFields) => (e: ChangeEvent<HTMLInputElement>) =>
        setFields((f: typeof emptyFields) => ({ ...f, [k]: e.target.value }));

    const canSubmit = fields.nombre.trim().length > 0 && Number(fields.capacidad) > 0;

    useEffect(() => {
        if (state.success && isOpen) {
            showSuccess("Sala agregada correctamente");
            setIsOpen(false);
            setFields(emptyFields);
            onSuccess();
        }
    }, [state.success, isOpen, showSuccess, onSuccess]);

    const handleClose = () => {
        setIsOpen(false);
        setFields(emptyFields);
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-cef-primary hover:bg-cef-primary/80 text-white rounded-lg transition-colors text-sm font-medium"
            >
                <Plus size={15} className="mr-2" />
                Nueva Sala
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="glass-modal rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h3 className="text-base font-semibold text-slate-800">Nueva Sala</h3>
                            <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors">
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
                                    onClick={handleClose}
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
                    </div>
                </div>
            )}
        </>
    );
}
