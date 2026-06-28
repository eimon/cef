"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { setProfesorEstado } from "@/actions/profesores";
import { Profesor } from "@/types/api";
import { useToast } from "@/context/ToastContext";

interface MarcarActivoProfesorDialogProps {
    profesor: Profesor;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function MarcarActivoProfesorDialog({ profesor, isOpen, onClose, onSuccess }: MarcarActivoProfesorDialogProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { showSuccess } = useToast();

    if (!isOpen) return null;

    const handleConfirm = async () => {
        setIsSaving(true);
        setError(null);
        const result = await setProfesorEstado(profesor.id, true);
        setIsSaving(false);
        if (result.error) {
            setError(result.error);
        } else {
            showSuccess("Profesor marcado como activo");
            onClose();
            onSuccess();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="glass-modal rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h3 className="text-base font-semibold text-slate-800">Marcar como activo</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-sm text-slate-600">
                        ¿Confirmás que querés marcar a este profesor como activo nuevamente? Va a volver a estar disponible para asignarle clases.
                    </p>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700">
                        <span className="font-semibold">{profesor.nombre} {profesor.apellido}</span>
                        <span className="text-slate-400 ml-2">· DNI: {profesor.dni}</span>
                    </div>

                    {profesor.motivo_inactividad && (
                        <p className="text-sm">
                            <span className="text-slate-400">Motivo de la inactividad: </span>
                            <span className="text-slate-700">{profesor.motivo_inactividad}</span>
                        </p>
                    )}

                    {error && (
                        <div className="bg-cef-danger/10 border border-cef-danger/20 text-cef-danger p-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div className="pt-2 flex justify-end space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={isSaving}
                            className="px-4 py-2 bg-cef-success hover:bg-cef-success/80 text-white rounded-lg disabled:opacity-60 flex items-center text-sm font-medium transition-colors"
                        >
                            {isSaving ? <Loader2 className="animate-spin mr-2" size={15} /> : null}
                            Marcar activo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
