"use client";

import { useState, useEffect, useActionState } from "react";
import { Loader2 } from "lucide-react";
import {
    updatePlazoPago,
    updateDiasAvisoVencimiento,
    type DiasFormState,
} from "@/actions/config";
import { useToast } from "@/context/ToastContext";

const inputCls = "w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 focus:border-cef-primary/60 focus:ring-2 focus:ring-cef-primary/15 outline-none transition-all text-sm";
const labelCls = "block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider";

function DiasSetting({
    title,
    description,
    valorActual: initialValor,
    unidad,
    action,
    onSuccess,
}: {
    title: string;
    description: string;
    valorActual: string;
    unidad: string;
    action: (prevState: DiasFormState, formData: FormData) => Promise<DiasFormState>;
    onSuccess: () => void;
}) {
    const { showSuccess } = useToast();
    const [valorActual, setValorActual] = useState(parseInt(initialValor, 10) || 0);
    const [inputValue, setInputValue] = useState("");
    const initialState: DiasFormState = {};
    const [state, formAction, isPending] = useActionState(action, initialState);

    useEffect(() => {
        if (state.success && state.nuevoValor !== undefined) {
            setValorActual(state.nuevoValor);
            setInputValue("");
            showSuccess(`${title} actualizado correctamente`);
            onSuccess();
        }
    }, [state.success, state.nuevoValor, showSuccess, onSuccess, title]);

    return (
        <div className="glass rounded-xl p-5 space-y-4">
            <div>
                <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
                <p className="text-xs text-slate-400 mt-1">{description}</p>
            </div>

            <form action={formAction} className="space-y-4">
                {state?.error && (
                    <div className="bg-cef-danger/10 border border-cef-danger/20 text-cef-danger p-3 rounded-lg text-xs">
                        {state.error}
                    </div>
                )}

                <div>
                    <label className={labelCls}>Valor actual</label>
                    <p className="text-sm text-slate-500 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                        {valorActual} {unidad}
                    </p>
                </div>

                <div>
                    <label className={labelCls}>Nuevo valor</label>
                    <div className="relative">
                        <input
                            name="valor"
                            type="number"
                            min="1"
                            step="1"
                            required
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => ["-", "+", "e", "E", "."].includes(e.key) && e.preventDefault()}
                            className={inputCls + " pr-16"}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">{unidad}</span>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={isPending || inputValue.trim() === ""}
                        className="px-4 py-2 bg-cef-primary hover:bg-cef-primary/80 text-white rounded-lg disabled:opacity-60 flex items-center text-sm font-medium transition-colors"
                    >
                        {isPending ? <Loader2 className="animate-spin mr-2" size={15} /> : null}
                        Actualizar
                    </button>
                </div>
            </form>
        </div>
    );
}

interface PlazosCardProps {
    plazoPago: string;
    diasAviso: string;
    onSuccess: () => void;
}

export default function PlazosCard({ plazoPago, diasAviso, onSuccess }: PlazosCardProps) {
    return (
        <div className="space-y-4">
            <DiasSetting
                title="Plazo de pago de renovación"
                description="Días que tiene el cliente para pagar la renovación antes de que la suscripción se marque como vencida."
                valorActual={plazoPago}
                unidad="días"
                action={updatePlazoPago}
                onSuccess={onSuccess}
            />
            <DiasSetting
                title="Aviso de vencimiento"
                description="Días de anticipación con los que se envía el email recordatorio antes de que venza el plazo de pago."
                valorActual={diasAviso}
                unidad="días"
                action={updateDiasAvisoVencimiento}
                onSuccess={onSuccess}
            />
        </div>
    );
}
