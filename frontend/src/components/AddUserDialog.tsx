"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createUser, UserFormState } from "@/actions/users";
import { Plus, X, Loader2 } from "lucide-react";
import { useActionState } from "react";
import { UserRole } from "@/types/api";
import { isValidEmail } from "@/lib/validation";
import { useToast } from "@/context/ToastContext";

const inputCls = "w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 focus:border-cef-primary/60 focus:ring-2 focus:ring-cef-primary/15 outline-none transition-all text-sm";
const labelCls = "block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider";

const roleLabels: Record<string, string> = {
    [UserRole.ADMIN]: "Administrador",
    [UserRole.RECEPCION]: "Recepción",
    [UserRole.CLIENTE]: "Cliente",
};

interface AddUserDialogProps {
    onSuccess?: () => void;
    roleOptions?: UserRole[];
}

export default function AddUserDialog({ onSuccess, roleOptions }: AddUserDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [dni, setDni] = useState("");
    const availableRoles = roleOptions?.length ? roleOptions : Object.values(UserRole);
    const [selectedRole, setSelectedRole] = useState<UserRole>(availableRoles[0] ?? UserRole.CLIENTE);
    const submitRef = useRef(false);
    const { showSuccess } = useToast();
    const initialState: UserFormState = { error: "", success: false };

    const [state, formAction, isPending] = useActionState(createUser, initialState);
    const requiresDni = selectedRole !== UserRole.CLIENTE;
    const canSubmit = isValidEmail(email) && password.trim().length > 0 && (!requiresDni || dni.trim().length > 0);

    const closeDialog = useCallback(() => {
        setIsOpen(false);
        setEmail("");
        setPassword("");
        setDni("");
        setSelectedRole(availableRoles[0] ?? UserRole.CLIENTE);
    }, [availableRoles]);

    useEffect(() => {
        if (!state.success || !isOpen || !submitRef.current) return;
        submitRef.current = false;
        showSuccess(state.message || "Usuario agregado correctamente");
        closeDialog();
        onSuccess?.();
    }, [state.success, state.message, isOpen, showSuccess, closeDialog, onSuccess]);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-cef-primary hover:bg-cef-primary/80 text-white rounded-lg transition-colors text-sm font-medium"
            >
                <Plus size={15} className="mr-2" />
                Nuevo Usuario
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="glass-modal rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                            <h3 className="text-base font-semibold text-slate-800">Añadir Nuevo Usuario</h3>
                            <button
                                onClick={closeDialog}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form
                            action={formAction}
                            autoComplete="off"
                            onSubmit={() => { submitRef.current = true; }}
                            className="p-6 space-y-4"
                        >
                            {state?.error && (
                                <div className="bg-cef-danger/10 border border-cef-danger/20 text-cef-danger p-3 rounded-lg text-sm">
                                    {state.error}
                                </div>
                            )}

                            <div>
                                <label className={labelCls}>Email</label>
                                <input name="new_user_email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="off" className={inputCls} />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>
                                        Nombre <span className="text-slate-300 normal-case tracking-normal">(opcional)</span>
                                    </label>
                                    <input name="nombre" type="text" className={inputCls} />
                                </div>
                                <div>
                                    <label className={labelCls}>
                                        Apellido <span className="text-slate-300 normal-case tracking-normal">(opcional)</span>
                                    </label>
                                    <input name="apellido" type="text" className={inputCls} />
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}>
                                    Teléfono <span className="text-slate-300 normal-case tracking-normal">(opcional)</span>
                                </label>
                                <input name="telefono" type="tel" className={inputCls} />
                            </div>

                            <div>
                                <label className={labelCls}>Rol</label>
                                <select
                                    name="role"
                                    className={inputCls}
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                                >
                                    {availableRoles.map((role) => (
                                        <option key={role} value={role}>
                                            {roleLabels[role] ?? role}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className={labelCls}>
                                    DNI {requiresDni
                                        ? null
                                        : <span className="text-slate-300 normal-case tracking-normal">(opcional)</span>
                                    }
                                </label>
                                <input
                                    name="dni"
                                    type="text"
                                    required={requiresDni}
                                    value={dni}
                                    onChange={(e) => setDni(e.target.value)}
                                    className={inputCls}
                                />
                            </div>

                            <div>
                                <label className={labelCls}>Contraseña</label>
                                <input name="new_user_password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" className={inputCls} />
                            </div>

                            <div className="pt-2 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={closeDialog}
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
            )}
        </>
    );
}
