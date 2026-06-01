"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { getUsers, type GetUsersParams } from "@/actions/users";
import { type User, UserRole } from "@/types/api";
import AddUserDialog from "@/components/AddUserDialog";
import UsersTable from "@/components/UsersTable";

interface UsersManagementPageProps {
    title: string;
    subtitle: string;
    visibleRoles: UserRole[];
    allowedRoles: UserRole[];
    emptyMessage: string;
    filteredEmptyMessage: string;
    showDniFilter?: boolean;
    showAddButton?: boolean;
    currentUserId?: string;
}

export default function UsersManagementPage({
    title,
    subtitle,
    visibleRoles,
    allowedRoles,
    emptyMessage,
    filteredEmptyMessage,
    showDniFilter = true,
    showAddButton = true,
    currentUserId,
}: UsersManagementPageProps) {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState<GetUsersParams>({ dni: "", nombre: "", apellido: "" });

    const hasActiveFilter = Boolean(
        filters.nombre?.trim() ||
        filters.apellido?.trim() ||
        (showDniFilter && filters.dni?.trim())
    );

    const refresh = useCallback(async (params: GetUsersParams = {}) => {
        setIsLoading(true);
        try {
            const data = await getUsers(showDniFilter ? params : { ...params, dni: undefined });
            setUsers(data.filter((user) => visibleRoles.includes(user.role as UserRole)));
        } catch {
            setUsers([]);
        } finally {
            setIsLoading(false);
        }
    }, [showDniFilter, visibleRoles]);

    useEffect(() => {
        let isActive = true;

        const loadUsers = async () => {
            try {
                const data = await getUsers();
                if (!isActive) return;
                setUsers(data.filter((user) => visibleRoles.includes(user.role as UserRole)));
            } catch {
                if (!isActive) return;
                setUsers([]);
            } finally {
                if (isActive) setIsLoading(false);
            }
        };

        void loadUsers();

        return () => {
            isActive = false;
        };
    }, [visibleRoles]);

    const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        await refresh(filters);
    };

    const handleReset = async () => {
        const emptyFilters = { dni: "", nombre: "", apellido: "" };
        setFilters(emptyFilters);
        await refresh(emptyFilters);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
                    <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
                </div>
                {showAddButton && allowedRoles.length > 0 && (
                    <AddUserDialog roleOptions={visibleRoles} onSuccess={() => refresh(filters)} />
                )}
            </div>

            <form
                onSubmit={handleSearch}
                className={`grid gap-4 items-end ${
                    showDniFilter ? "md:grid-cols-[1fr_1fr_1fr_auto]" : "md:grid-cols-[1fr_1fr_auto]"
                }`}
            >
                <div>
                    <label className="block text-sm font-medium text-slate-700">Nombre</label>
                    <input
                        value={filters.nombre}
                        onChange={(event) => setFilters((prev) => ({ ...prev, nombre: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-cef-primary focus:outline-none focus:ring-2 focus:ring-cef-primary/20"
                        placeholder="Buscar por nombre"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Apellido</label>
                    <input
                        value={filters.apellido}
                        onChange={(event) => setFilters((prev) => ({ ...prev, apellido: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-cef-primary focus:outline-none focus:ring-2 focus:ring-cef-primary/20"
                        placeholder="Buscar por apellido"
                    />
                </div>
                {showDniFilter && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700">DNI</label>
                        <input
                            value={filters.dni}
                            onChange={(event) => setFilters((prev) => ({ ...prev, dni: event.target.value }))}
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-cef-primary focus:outline-none focus:ring-2 focus:ring-cef-primary/20"
                            placeholder="Buscar por DNI"
                        />
                    </div>
                )}
                <div className="flex gap-2">
                    <button
                        type="submit"
                        className="h-11 rounded-xl bg-cef-primary px-5 text-sm font-semibold text-white transition hover:bg-cef-primary-dark"
                    >
                        Buscar
                    </button>
                    <button
                        type="button"
                        onClick={handleReset}
                        className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                        Limpiar
                    </button>
                </div>
            </form>

            {isLoading ? (
                <div className="text-center py-12 glass rounded-xl">
                    <p className="text-slate-400 text-sm">Cargando...</p>
                </div>
            ) : (
                <UsersTable
                    users={users}
                    allowedRoles={allowedRoles}
                    emptyMessage={hasActiveFilter ? filteredEmptyMessage : emptyMessage}
                    onSuccess={() => refresh(filters)}
                    currentUserId={currentUserId}
                />
            )}
        </div>
    );
}
