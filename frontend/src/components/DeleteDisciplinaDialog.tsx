"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { deleteDisciplinaAdmin } from "@/actions/disciplinas";
import { DisciplinaItem } from "@/types/api";
import { useToast } from "@/context/ToastContext";

interface DeleteDisciplinaDialogProps {
    disciplina: DisciplinaItem;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function DeleteDisciplinaDialog({ disciplina, isOpen, onClose, onSuccess }: DeleteDisciplinaDialogProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { showSuccess } = useToast();

    if (!isOpen) return null;

    const handleDelete = async () => {
        setIsDeleting(true);
        setError(null);
        const result = await deleteDisciplinaAdmin(disciplina.id);
        setIsDeleting(false);
        if (result.error) {
            setError(result.error);
        } else {
            showSuccess("Disciplina eliminada correctamente");
            onClose();
            onSuccess();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="glass-modal rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h3 className="text-base font-semibold text-slate-800">Dar de baja disciplina</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-sm text-slate-600">
                        ¿Está seguro que desea eliminar la disciplina?
                    </p>

                    <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700">
                        <span className="font-semibold">
                            {disciplina.nombre.charAt(0).toUpperCase() + disciplina.nombre.slice(1)}
                        </span>
                    </div>

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
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="px-4 py-2 bg-cef-danger hover:bg-cef-danger/80 text-white rounded-lg disabled:opacity-60 flex items-center text-sm font-medium transition-colors"
                        >
                            {isDeleting ? <Loader2 className="animate-spin mr-2" size={15} /> : null}
                            Eliminar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
