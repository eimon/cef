"use client";

import { useState } from "react";
import { X, Loader2, Search } from "lucide-react";
import { getProfesorByDni, deleteProfesor } from "@/actions/profesores";
import { Profesor } from "@/types/api";
import { useToast } from "@/context/ToastContext";

const inputCls = "w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 focus:border-cef-primary/60 focus:ring-2 focus:ring-cef-primary/15 outline-none transition-all text-sm";
const labelCls = "block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider";

interface DeleteProfesorDialogProps {
    onSuccess: () => void;
}

export default function DeleteProfesorDialog({ onSuccess }: DeleteProfesorDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [dni, setDni] = useState("");
    const [profesor, setProfesor] = useState<Profesor | null>(null);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { showSuccess } = useToast();

    const handleClose = () => {
        setIsOpen(false);
        setDni("");
        setProfesor(null);
        setSearchError(null);
        setDeleteError(null);
    };

    const handleSearch = async () => {
        if (!dni.trim()) return;
        setIsSearching(true);
        setSearchError(null);
        setProfesor(null);
        const found = await getProfesorByDni(dni.trim());
        setIsSearching(false);
        if (!found) {
            setSearchError("No se encontró ningún profesor con el DNI ingresado");
        } else {
            setProfesor(found);
        }
    };

    const handleDelete = async () => {
        if (!profesor) return;
        setIsDeleting(true);
        setDeleteError(null);
        const result = await deleteProfesor(profesor.id);
        setIsDeleting(false);
        if (result.error) {
            setDeleteError(result.error);
        } else {
            showSuccess("Profesor eliminado correctamente");
            handleClose();
            onSuccess();
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-cef-danger/10 hover:bg-cef-danger/20 text-cef-danger border border-cef-danger/20 rounded-lg transition-colors text-sm font-medium"
            >
                Dar de baja
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="glass-modal rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h3 className="text-base font-semibold text-slate-800">Dar de baja a profesor</h3>
                            <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {!profesor ? (
                                <>
                                    <div>
                                        <label className={labelCls}>DNI del profesor</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={dni}
                                                onChange={(e) => setDni(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                                placeholder="Ingrese el DNI"
                                                className={inputCls}
                                            />
                                            <button
                                                onClick={handleSearch}
                                                disabled={isSearching || !dni.trim()}
                                                className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg disabled:opacity-60 flex items-center text-sm font-medium transition-colors shrink-0"
                                            >
                                                {isSearching
                                                    ? <Loader2 size={15} className="animate-spin" />
                                                    : <Search size={15} />
                                                }
                                            </button>
                                        </div>
                                    </div>

                                    {searchError && (
                                        <div className="bg-cef-danger/10 border border-cef-danger/20 text-cef-danger p-3 rounded-lg text-sm">
                                            {searchError}
                                        </div>
                                    )}

                                    <div className="pt-2 flex justify-end">
                                        <button
                                            onClick={handleClose}
                                            className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm text-slate-600">
                                        ¿Está seguro que desea eliminar al profesor?
                                    </p>

                                    <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-700">
                                        <span className="font-semibold">{profesor.nombre} {profesor.apellido}</span>
                                        <span className="text-slate-400 ml-2">· DNI: {profesor.dni}</span>
                                    </div>

                                    {deleteError && (
                                        <div className="bg-cef-danger/10 border border-cef-danger/20 text-cef-danger p-3 rounded-lg text-sm">
                                            {deleteError}
                                        </div>
                                    )}

                                    <div className="pt-2 flex justify-end space-x-3">
                                        <button
                                            onClick={handleClose}
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
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
