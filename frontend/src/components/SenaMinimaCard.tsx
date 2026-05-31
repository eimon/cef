"use client";

import { useState, useEffect, useActionState } from "react";
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
    const [porcentajeActual, setPorcentajeActual] = useState(parseFloat(valorActual) || 50);
    const [inputValue, setInputValue] = useState("");
    const initialState: SenaMinimaFormState = {};
    const [state, formAction, isPending] = useActionState(updateSenaMinima, initialState);

    useEffect(() => {
        if (state.success && state.nuevoValor !== undefined) {
            setPorcentajeActual(state.nuevoValor);
            setInputValue("");
            showSuccess("Porcentaje mínimo de seña actualizado correctamente");
            onSuccess();
        }
    }, [state.success, state.nuevoValor, showSuccess, onSuccess]);

    return (
        <div className="glass rounded-xl p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-1">Porcentaje mínimo de seña</h2>
            <p className="text-sm text-slate-400 mb-5">
                Definí el porcentaje mínimo del precio de la clase requerido para reservas con pago parcial. El sistema calculará el monto de seña según el precio de cada clase. Mínimo: 50%.
            </p>

            <form action={formAction} className="space-y-4">
                {state?.error && (
                    <div className="bg-cef-danger/10 border border-cef-danger/20 text-cef-danger p-3 rounded-lg text-sm">
                        {state.error}
                    </div>
                )}

                <div>
                    <label className={labelCls}>Porcentaje actual</label>
                    <p className="text-sm text-slate-500 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                        {porcentajeActual}%
                    </p>
                </div>

                <div>
                    <label className={labelCls}>Nuevo porcentaje</label>
                    <div className="relative">
                        <input
                            name="valor"
                            type="number"
                            step="1"
                            required
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => ["-", "+", "e", "E", "."].includes(e.key) && e.preventDefault()}
                            className={inputCls + " pr-8"}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">%</span>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={isPending || inputValue.trim() === ""}
                        className="px-4 py-2 bg-cef-primary hover:bg-cef-primary/80 text-white rounded-lg disabled:opacity-60 flex items-center text-sm font-medium transition-colors"
                    >
                        {isPending ? <Loader2 className="animate-spin mr-2" size={15} /> : null}
                        Actualizar Porcentaje
                    </button>
                </div>
            </form>
        </div>
    );
}
