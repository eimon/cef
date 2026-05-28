"use client";

import { useEffect, useActionState } from "react";
import { X, Loader2 } from "lucide-react";
import { updateDisciplinaPrecio, DisciplinaPrecioFormState } from "@/actions/disciplinas";
import { PrecioDisciplina, Disciplina } from "@/types/api";
import { useToast } from "@/context/ToastContext";

interface EditDisciplinaPrecioDialogProps {
    precio: PrecioDisciplina;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const DISCIPLINA_LABELS: Record<Disciplina, string> = {
    yoga: "Yoga",
    pilates: "Pilates",
    funcional: "Funcional",
};

const inputCls = "w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 focus:border-cef-primary/60 focus:ring-2 focus:ring-cef-primary/15 outline-none transition-all text-sm";
const labelCls = "block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider";

export default function EditDisciplinaPrecioDialog({
    precio,
    isOpen,
    onClose,
    onSuccess,
}: EditDisciplinaPrecioDialogProps) {
    const { showSuccess } = useToast();
    const initialState: DisciplinaPrecioFormState = {};
    const updateWithDisciplina = updateDisciplinaPrecio.bind(null, precio.disciplina);
    const [state, formAction, isPending] = useActionState(updateWithDisciplina, initialState);

    useEffect(() => {
        if (state.success && isOpen) {
            showSuccess(`Precios de ${DISCIPLINA_LABELS[precio.disciplina]} actualizados correctamente`);
            onClose();
            onSuccess();
        }
    }, [state.success, isOpen, onClose, onSuccess, showSuccess, precio.disciplina]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="glass-modal rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h3 className="text-base font-semibold text-slate-800">
                        Modificar precios — {DISCIPLINA_LABELS[precio.disciplina]}
                    </h3>
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

                    <p className="text-xs text-slate-400">
                        El nuevo precio aplicará a las próximas inscripciones y suscripciones. Los pagos ya realizados no se modifican.
                    </p>

                    <div>
                        <label className={labelCls}>Precio mensualidad</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">$</span>
                            <input
                                name="precio_suscripcion"
                                type="number"
                                step="0.01"
                                defaultValue={precio.precio_suscripcion}
                                required
                                className={inputCls + " pl-7"}
                            />
                        </div>
                    </div>

                    <div>
                        <label className={labelCls}>Precio clase individual</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">$</span>
                            <input
                                name="precio_individual"
                                type="number"
                                step="0.01"
                                defaultValue={precio.precio_individual}
                                required
                                className={inputCls + " pl-7"}
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
                            disabled={isPending}
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
