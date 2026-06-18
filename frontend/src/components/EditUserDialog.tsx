"use client";

import { useEffect, useState } from "react";
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
    onSuccess?: () => void;
}

const inputCls = "w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 focus:border-cef-primary/60 focus:ring-2 focus:ring-cef-primary/15 outline-none transition-all text-sm";
const labelCls = "block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider";

const roleLabels: Record<string, string> = {
    [UserRole.ADMIN]: "Administrador",
    [UserRole.RECEPCION]: "Recepcion",
    [UserRole.CLIENTE]: "Cliente",
};

function dateInputValue(value: string | null): string {
    return value ? value.slice(0, 10) : "";
}

export default function EditUserDialog({ user, isOpen, onClose, allowedRoles, onSuccess }: EditUserDialogProps) {
    const { showSuccess } = useToast();
    const { refresh } = useRouter();
    const [selectedRole, setSelectedRole] = useState<string>(String(user.role));

    const updateUserWithId = updateUser.bind(null, user.id);
    const [state, formAction, isPending] = useActionState(updateUserWithId, {} as UserFormState);

    const isClientOnly = allowedRoles.length === 1 && allowedRoles[0] === UserRole.CLIENTE;
    const showRoleField = allowedRoles.length > 0 && !isClientOnly;
    const requiresDni = showRoleField && selectedRole !== UserRole.CLIENTE;

    useEffect(() => {
        if (!state.success) return;
        showSuccess("Usuario actualizado correctamente");
        onClose();
        onSuccess?.();
        refresh();
    }, [state.success, showSuccess, onClose, onSuccess, refresh]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="glass-modal rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h3 className="text-base font-semibold text-slate-800">
                        {isClientOnly ? "Editar cliente" : "Editar usuario"}
                    </h3>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form action={formAction} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-73px)]">
                    {state?.error && (
                        <div className="bg-cef-danger/10 border border-cef-danger/20 text-cef-danger p-3 rounded-lg text-sm">
                            {state.error}
                        </div>
                    )}

                    <div className="grid gap-3 md:grid-cols-2">
                        <div>
                            <label htmlFor="edit-user-email" className={labelCls}>Email</label>
                            <input
                                id="edit-user-email"
                                name="email"
                                type="email"
                                required
                                defaultValue={user.email}
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label htmlFor="edit-user-telefono" className={labelCls}>Telefono</label>
                            <input
                                id="edit-user-telefono"
                                name="telefono"
                                type="tel"
                                defaultValue={user.telefono ?? ""}
                                className={inputCls}
                            />
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                        <div>
                            <label htmlFor="edit-user-nombre" className={labelCls}>Nombre</label>
                            <input
                                id="edit-user-nombre"
                                name="nombre"
                                type="text"
                                defaultValue={user.nombre ?? ""}
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label htmlFor="edit-user-apellido" className={labelCls}>Apellido</label>
                            <input
                                id="edit-user-apellido"
                                name="apellido"
                                type="text"
                                defaultValue={user.apellido ?? ""}
                                className={inputCls}
                            />
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                        <div>
                            <label htmlFor="edit-user-dni" className={labelCls}>DNI</label>
                            <input
                                id="edit-user-dni"
                                name="dni"
                                type="text"
                                required={requiresDni}
                                defaultValue={user.dni ?? ""}
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label htmlFor="edit-user-fecha" className={labelCls}>Nacimiento</label>
                            <input
                                id="edit-user-fecha"
                                name="fecha_nacimiento"
                                type="date"
                                defaultValue={dateInputValue(user.fecha_nacimiento)}
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label htmlFor="edit-user-genero" className={labelCls}>Genero</label>
                            <input
                                id="edit-user-genero"
                                name="genero"
                                type="text"
                                defaultValue={user.genero ?? ""}
                                className={inputCls}
                            />
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                        {showRoleField && (
                            <div>
                                <label htmlFor="edit-user-role" className={labelCls}>Rol</label>
                                <select
                                    id="edit-user-role"
                                    name="role"
                                    defaultValue={String(user.role)}
                                    className={inputCls}
                                    onChange={(event) => setSelectedRole(event.target.value)}
                                >
                                    {allowedRoles.map((role) => (
                                        <option key={role} value={role}>
                                            {roleLabels[role] ?? role}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div>
                            <label htmlFor="edit-user-activo" className={labelCls}>Estado</label>
                            <select
                                id="edit-user-activo"
                                name="activo"
                                defaultValue={String(user.activo)}
                                className={inputCls}
                            >
                                <option value="true">Activo</option>
                                <option value="false">Inactivo</option>
                            </select>
                        </div>
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
                            Guardar cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
