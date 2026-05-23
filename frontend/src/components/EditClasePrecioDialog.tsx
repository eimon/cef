"use client";

import { useState, useEffect, useActionState } from "react";
import { X, Loader2 } from "lucide-react";
import { updateClasePrecio, ClasePrecioFormState } from "@/actions/clases";
import { useToast } from "@/context/ToastContext";

interface ClaseConPrecios {
    id: string;
    nombre: string;
    precio_individual: number;
    precio_suscripcion: number;
}

interface EditClasePrecioDialogProps {
    clase: ClaseConPrecios;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const inputCls = "w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 focus:border-cef-primary/60 focus:ring-2 focus:ring-cef-primary/15 outline-none transition-all text-sm";
const labelCls = "block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider";

function formatPrecio(value: number) {
    return new Intl.NumberFormat("es-AR").format(value);
}

export default function EditClasePrecioDialog({ clase, isOpen, onClose, onSuccess }: EditClasePrecioDialogProps) {
    const { showSuccess } = useToast();
    const [tipo, setTipo] = useState<"mensualidad" | "individual">("mensualidad");

    const initialState: ClasePrecioFormState = {};
    const updatePrecioWithId = updateClasePrecio.bind(null, clase.id);
    const [state, formAction, isPending] = useActionState(updatePrecioWithId, initialState);

    const currentPrice = tipo === "mensualidad" ? clase.precio_suscripcion : clase.precio_individual;

    useEffect(() => {
        if (state.success && isOpen) {
            const msg =
                state.tipo === "mensualidad"
                    ? `Precio actualizado correctamente. El nuevo valor de $${formatPrecio(state.precio!)} aplicará a las próximas contrataciones`
                    : `Precio actualizado correctamente. El nuevo valor de $${formatPrecio(state.precio!)} aplicará a las próximas reservas`;
            showSuccess(msg);
            onClose();
            onSuccess();
        }
    }, [state.success, isOpen, onClose, onSuccess, showSuccess, state.tipo, state.precio]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="glass-modal rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h3 className="text-base font-semibold text-slate-800">Modificar precio — {clase.nombre}</h3>
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

                    <input type="hidden" name="tipo" value={tipo} />

                    <div>
                        <label className={labelCls}>Tipo de precio</label>
                        <select
                            value={tipo}
                            onChange={(e) => setTipo(e.target.value as "mensualidad" | "individual")}
                            className={inputCls}
                        >
                            <option value="mensualidad">Mensualidad</option>
                            <option value="individual">Clase individual</option>
                        </select>
                    </div>

                    <div>
                        <label className={labelCls}>
                            Precio actual
                        </label>
                        <p className="text-sm text-slate-500 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                            ${formatPrecio(currentPrice)}
                        </p>
                    </div>

                    <div>
                        <label className={labelCls}>Nuevo precio</label>
                        <input
                            key={tipo}
                            name="precio"
                            type="number"
                            step="0.01"
                            defaultValue={currentPrice}
                            required
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
