"use client";

import { useEffect } from "react";
import { updateUser, UserFormState } from "@/actions/users";
import { X, Loader2 } from "lucide-react";
import { useActionState } from "react";
import { User, UserRole } from "@/types/api";
import { useToast } from "@/context/ToastContext";
import { useRouter } from "next/navigation";

interface EditUserDialogProps {
    user: User;
    isOpen: boolean;
    onClose: () => void;
    allowedRoles: UserRole[];
}

const inputCls = "w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 focus:border-cef-primary/60 focus:ring-2 focus:ring-cef-primary/15 outline-none transition-all text-sm";
const labelCls = "block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider";

const roleLabels: Record<string, string> = {
    [UserRole.ADMIN]: "Administrador",
    [UserRole.RECEPCION]: "Recepción",
    [UserRole.CLIENTE]: "Cliente",
};

export default function EditUserDialog({ user, isOpen, onClose, allowedRoles }: EditUserDialogProps) {
    const { showSuccess } = useToast();
    const { refresh } = useRouter();

    const updateUserWithId = updateUser.bind(null, user.id);
    const [state, formAction, isPending] = useActionState(updateUserWithId, {} as UserFormState);

    useEffect(() => {
        if (!state.success) return;
        showSuccess("Usuario actualizado correctamente");
        onClose();
        refresh();
    }, [state.success, showSuccess, onClose, refresh]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="glass-modal rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h3 className="text-base font-semibold text-slate-800">Editar Usuario</h3>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form action={formAction} className="p-6 space-y-4">
                    {state?.error && (
                        <div className="bg-cef-danger/10 border border-cef-danger/20 text-cef-danger p-3 rounded-lg text-sm">
                            {state.error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelCls}>
                                Nombre <span className="text-slate-300 normal-case tracking-normal">(opcional)</span>
                            </label>
                            <input
                                name="nombre"
                                type="text"
                                defaultValue={user.nombre ?? ""}
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>
                                Apellido <span className="text-slate-300 normal-case tracking-normal">(opcional)</span>
                            </label>
                            <input
                                name="apellido"
                                type="text"
                                defaultValue={user.apellido ?? ""}
                                className={inputCls}
                            />
                        </div>
                    </div>

                    {allowedRoles.length > 0 && (
                        <div>
                            <label htmlFor="edit-user-role" className={labelCls}>Rol</label>
                            <select id="edit-user-role" name="role" defaultValue={user.role} className={inputCls}>
                                {allowedRoles.map((role) => (
                                    <option key={role} value={role}>
                                        {roleLabels[role] ?? role}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className={labelCls}>Contraseña</label>
                        <input
                            name="password"
                            type="password"
                            placeholder="Dejar en blanco para mantener la actual"
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
                            Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
