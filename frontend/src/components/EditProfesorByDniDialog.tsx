"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Search } from "lucide-react";
import { getProfesorByDni, updateProfesor, ProfesorFormState } from "@/actions/profesores";
import { Profesor } from "@/types/api";
import { useToast } from "@/context/ToastContext";
import { useActionState } from "react";

const inputCls = "w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 focus:border-cef-primary/60 focus:ring-2 focus:ring-cef-primary/15 outline-none transition-all text-sm";
const labelCls = "block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider";

const generoOptions = ["masculino", "femenino", "otro"];

function EditProfesorForm({
    profesor,
    onClose,
    onSuccess,
}: {
    profesor: Profesor;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const { showSuccess } = useToast();
    const initialState: ProfesorFormState = {};
    const updateProfesorWithId = updateProfesor.bind(null, profesor.id);
    const [state, formAction, isPending] = useActionState(updateProfesorWithId, initialState);

    useEffect(() => {
        if (state.success) {
            showSuccess("Profesor actualizado correctamente");
            onClose();
            onSuccess();
        }
    }, [state.success, onClose, showSuccess, onSuccess]);

    return (
        <form action={formAction} className="space-y-4">
            {state?.error && (
                <div className="bg-cef-danger/10 border border-cef-danger/20 text-cef-danger p-3 rounded-lg text-sm">
                    {state.error}
                </div>
            )}

            <div>
                <label className={labelCls}>DNI</label>
                <input name="dni" type="text" required defaultValue={profesor.dni} className={inputCls} />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelCls}>Nombre</label>
                    <input name="nombre" type="text" required defaultValue={profesor.nombre} className={inputCls} />
                </div>
                <div>
                    <label className={labelCls}>Apellido</label>
                    <input name="apellido" type="text" required defaultValue={profesor.apellido} className={inputCls} />
                </div>
            </div>

            <div>
                <label className={labelCls}>Género</label>
                <select name="genero" defaultValue={profesor.genero ?? ""} className={inputCls}>
                    {generoOptions.map((g) => (
                        <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className={labelCls}>
                    Email <span className="text-slate-300 normal-case tracking-normal">(opcional)</span>
                </label>
                <input name="email" type="email" defaultValue={profesor.email ?? ""} className={inputCls} />
            </div>

            <div>
                <label className={labelCls}>
                    Teléfono <span className="text-slate-300 normal-case tracking-normal">(opcional)</span>
                </label>
                <input name="telefono" type="tel" defaultValue={profesor.telefono ?? ""} className={inputCls} />
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
    );
}

interface EditProfesorByDniDialogProps {
    onSuccess: () => void;
}

export default function EditProfesorByDniDialog({ onSuccess }: EditProfesorByDniDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [dni, setDni] = useState("");
    const [profesor, setProfesor] = useState<Profesor | null>(null);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [isSearching, setIsSearching] = useState(false);

    const handleClose = () => {
        setIsOpen(false);
        setDni("");
        setProfesor(null);
        setSearchError(null);
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

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm font-medium"
            >
                Editar
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="glass-modal rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h3 className="text-base font-semibold text-slate-800">Editar Profesor</h3>
                            <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6">
                            {!profesor ? (
                                <div className="space-y-4">
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
                                </div>
                            ) : (
                                <EditProfesorForm
                                    key={profesor.id}
                                    profesor={profesor}
                                    onClose={handleClose}
                                    onSuccess={onSuccess}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
