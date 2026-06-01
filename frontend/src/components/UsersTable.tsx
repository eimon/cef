"use client";

import { useState, useEffect, useRef } from "react";
import { User, UserRole } from "@/types/api";
import { Pencil, Trash2, MoreVertical, Loader2 } from "lucide-react";
import { deleteUser } from "@/actions/users";
import EditUserDialog from "@/components/EditUserDialog";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { useRouter } from "next/navigation";

interface UsersTableProps {
    users: User[];
    allowedRoles: UserRole[];
    emptyMessage?: string;
    onSuccess?: () => void;
}

const roleBadgeClass: Record<string, string> = {
    [UserRole.ADMIN]: "bg-cef-danger/10 text-cef-danger",
    [UserRole.RECEPCION]: "bg-cef-primary/10 text-cef-primary",
    [UserRole.CLIENTE]: "bg-cef-success/10 text-cef-success",
};

const roleLabels: Record<string, string> = {
    [UserRole.ADMIN]: "Administrador",
    [UserRole.RECEPCION]: "Recepción",
    [UserRole.CLIENTE]: "Cliente",
};

function UserCardMenu({
    isDeleting,
    onEdit,
    onDelete,
}: {
    isDeleting: boolean;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    const item = (label: string, onClick: () => void, className = "", disabled = false) => (
        <button
            onClick={() => { setOpen(false); onClick(); }}
            disabled={disabled}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left hover:bg-slate-100 transition-colors disabled:opacity-40 ${className}`}
        >
            {label}
        </button>
    );

    return (
        <div ref={ref} className="relative">
            <button
                onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <MoreVertical size={16} />}
            </button>

            {open && (
                <div className="absolute right-0 top-8 z-30 w-40 glass-modal rounded-xl overflow-hidden py-1">
                    {item("Editar", onEdit, "text-cef-primary")}
                    {item("Eliminar", onDelete, "text-cef-danger", isDeleting)}
                </div>
            )}
        </div>
    );
}

export default function UsersTable({ users, allowedRoles, emptyMessage, onSuccess }: UsersTableProps) {
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const { showError, showSuccess } = useToast();
    const { confirm } = useConfirm();
    const { refresh } = useRouter();

    const handleDelete = async (user: User) => {
        if (!await confirm(`¿Estás seguro de que deseas eliminar al usuario ${user.email}? Esta acción no se puede deshacer.`)) return;

        setIsDeleting(user.id);
        const result = await deleteUser(user.id);
        setIsDeleting(null);

        if (result.error) { showError(result.error); return; }
        showSuccess("Usuario eliminado correctamente");
        onSuccess?.();
        refresh();
    };

    if (users.length === 0) {
        return (
            <div className="text-center py-12 glass rounded-xl border-dashed">
                <p className="text-slate-400 text-sm">{emptyMessage ?? "No se encontraron usuarios."}</p>
            </div>
        );
    }

    return (
        <>
            {/* ── Mobile: cards ── */}
            <div className="flex flex-col gap-3 md:hidden">
                {users.map((user) => (
                    <div key={user.id} className="glass rounded-xl px-4 py-3.5">
                        {/* Row 1: name + badges + menu */}
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center flex-wrap gap-1.5 min-w-0">
                                <span className="text-sm font-semibold text-slate-700">
                                    {[user.nombre, user.apellido].filter(Boolean).join(" ") || "—"}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${roleBadgeClass[user.role] ?? "bg-slate-100 text-slate-500"}`}>
                                    {roleLabels[user.role] ?? user.role}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${user.activo
                                    ? "bg-cef-success/10 text-cef-success"
                                    : "bg-slate-100 text-slate-400"
                                    }`}>
                                    {user.activo ? "Activo" : "Inactivo"}
                                </span>
                            </div>
                            <UserCardMenu
                                isDeleting={isDeleting === user.id}
                                onEdit={() => setEditingUser(user)}
                                onDelete={() => handleDelete(user)}
                            />
                        </div>

                        {/* Row 2: email + telefono */}
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span>{user.email}</span>
                            {user.telefono && (
                                <>
                                    <span className="text-slate-200">·</span>
                                    <span>{user.telefono}</span>
                                </>
                            )}
                            {user.dni && (
                                <>
                                    <span className="text-slate-200">-</span>
                                    <span>DNI: {user.dni}</span>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Desktop: table ── */}
            <div className="hidden md:block glass rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Nombre
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Email
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    DNI
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Teléfono
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Rol
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Estado
                                </th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">
                                        {[user.nombre, user.apellido].filter(Boolean).join(" ") || "—"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {user.email}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {user.dni || "-"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {user.telefono || "—"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleBadgeClass[user.role] ?? "bg-slate-100 text-slate-500"}`}>
                                            {roleLabels[user.role] ?? user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.activo
                                            ? "bg-cef-success/10 text-cef-success"
                                            : "bg-slate-100 text-slate-400"
                                            }`}>
                                            {user.activo ? "Activo" : "Inactivo"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                        <div className="flex items-center justify-end space-x-1">
                                            <button
                                                onClick={() => setEditingUser(user)}
                                                className="p-1.5 text-cef-primary/70 hover:bg-cef-primary/10 hover:text-cef-primary rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <Pencil size={15} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user)}
                                                disabled={isDeleting === user.id}
                                                className="p-1.5 text-cef-danger/70 hover:bg-cef-danger/10 hover:text-cef-danger rounded-lg transition-colors disabled:opacity-40"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {editingUser && (
                <EditUserDialog
                    user={editingUser}
                    isOpen={true}
                    onClose={() => setEditingUser(null)}
                    allowedRoles={allowedRoles}
                    onSuccess={onSuccess}
                />
            )}
        </>
    );
}
