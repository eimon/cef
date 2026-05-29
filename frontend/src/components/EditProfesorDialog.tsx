"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { updateProfesor, ProfesorFormState } from "@/actions/profesores";
import { X, Loader2 } from "lucide-react";
import { useActionState } from "react";
import { Profesor } from "@/types/api";
import { useToast } from "@/context/ToastContext";
import { isEmptyOrValidEmail } from "@/lib/validation";

interface EditProfesorDialogProps {
    profesor: Profesor;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const inputCls = "w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 focus:border-cef-primary/60 focus:ring-2 focus:ring-cef-primary/15 outline-none transition-all text-sm";
const labelCls = "block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider";

const generoOptions = ["masculino", "femenino", "otro"];

function getInitialFields(profesor: Profesor) {
    return {
        dni: profesor.dni ?? "",
        nombre: profesor.nombre ?? "",
        apellido: profesor.apellido ?? "",
        genero: profesor.genero ?? "masculino",
        email: profesor.email ?? "",
        telefono: profesor.telefono ?? "",
    };
}

export default function EditProfesorDialog({ profesor, isOpen, onClose, onSuccess }: EditProfesorDialogProps) {
    const { showSuccess } = useToast();
    const [fields, setFields] = useState(() => getInitialFields(profesor));
    const initialState: ProfesorFormState = {};
    const updateProfesorWithId = updateProfesor.bind(null, profesor.id);
    const [state, formAction, isPending] = useActionState(updateProfesorWithId, initialState);

    const set = (key: keyof typeof fields) =>
        (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
            setFields((current) => ({ ...current, [key]: event.target.value }));

    const canSubmit =
        fields.dni.trim().length > 0 &&
        fields.nombre.trim().length > 0 &&
        fields.apellido.trim().length > 0 &&
        fields.genero.trim().length > 0 &&
        isEmptyOrValidEmail(fields.email);

    useEffect(() => {
        if (!isOpen) return;
        setFields(getInitialFields(profesor));
    }, [isOpen, profesor]);

    useEffect(() => {
        if (state.success && isOpen) {
            showSuccess("Profesor actualizado correctamente");
            onClose();
            onSuccess();
        }
    }, [state.success, isOpen, onClose, showSuccess, onSuccess]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="glass-modal rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h3 className="text-base font-semibold text-slate-800">Editar Profesor</h3>
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
                        <label className={labelCls}>DNI</label>
                        <input
                            name="dni"
                            type="text"
                            required
                            value={fields.dni}
                            onChange={set("dni")}
                            className={inputCls}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
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
                            <label className={labelCls}>Apellido</label>
                            <input
                                name="apellido"
                                type="text"
                                required
                                value={fields.apellido}
                                onChange={set("apellido")}
                                className={inputCls}
                            />
                        </div>
                    </div>

                    <div>
                        <label className={labelCls}>Género</label>
                        <select name="genero" required value={fields.genero} onChange={set("genero")} className={inputCls}>
                            {generoOptions.map((g) => (
                                <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className={labelCls}>
                            Email <span className="text-slate-300 normal-case tracking-normal">(opcional)</span>
                        </label>
                        <input
                            name="email"
                            type="email"
                            value={fields.email}
                            onChange={set("email")}
                            className={inputCls}
                        />
                    </div>

                    <div>
                        <label className={labelCls}>
                            Teléfono <span className="text-slate-300 normal-case tracking-normal">(opcional)</span>
                        </label>
                        <input
                            name="telefono"
                            type="tel"
                            value={fields.telefono}
                            onChange={set("telefono")}
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
