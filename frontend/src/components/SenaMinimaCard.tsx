"use client";

import { useEffect, useActionState } from "react";
import { Loader2 } from "lucide-react";
import { updateSenaMinima, SenaMinimaFormState } from "@/actions/config";
import { useToast } from "@/context/ToastContext";

const inputCls = "w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 focus:border-cef-primary/60 focus:ring-2 focus:ring-cef-primary/15 outline-none transition-all text-sm";
const labelCls = "block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider";

interface SenaMinimaCardProps {
    valorActual: string;
    onSuccess: () => void;
}

export default function SenaMinimaCard({ valorActual, onSuccess }: SenaMinimaCardProps) {
    const { showSuccess } = useToast();
    const initialState: SenaMinimaFormState = {};
    const [state, formAction, isPending] = useActionState(updateSenaMinima, initialState);

    useEffect(() => {
        if (state.success) {
            showSuccess("Monto mínimo de seña actualizado correctamente");
            onSuccess();
        }
    }, [state.success, showSuccess, onSuccess]);

    return (
        <div className="glass rounded-xl p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-1">Monto mínimo de seña</h2>
            <p className="text-sm text-slate-400 mb-5">
                Definí el importe mínimo requerido para reservas con pago parcial.
            </p>

            <form action={formAction} className="space-y-4">
                {state?.error && (
                    <div className="bg-cef-danger/10 border border-cef-danger/20 text-cef-danger p-3 rounded-lg text-sm">
                        {state.error}
                    </div>
                )}

                <div>
                    <label className={labelCls}>Monto actual</label>
                    <p className="text-sm text-slate-500 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                        ${new Intl.NumberFormat("es-AR").format(parseFloat(valorActual) || 0)}
                    </p>
                </div>

                <div>
                    <label className={labelCls}>Nuevo monto</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">$</span>
                        <input
                            name="valor"
                            type="number"
                            step="0.01"
                            required
                            className={inputCls + " pl-7"}
                        />
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={isPending}
                        className="px-4 py-2 bg-cef-primary hover:bg-cef-primary/80 text-white rounded-lg disabled:opacity-60 flex items-center text-sm font-medium transition-colors"
                    >
                        {isPending ? <Loader2 className="animate-spin mr-2" size={15} /> : null}
                        Actualizar Monto
                    </button>
                </div>
            </form>
        </div>
    );
}
