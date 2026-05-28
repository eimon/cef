"use client";

import { useState, useEffect, useCallback } from "react";
import { getUsers } from "@/actions/users";
import { User } from "@/types/api";
import UsersTable from "@/components/UsersTable";
import AddUserDialog from "@/components/AddUserDialog";

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const refresh = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getUsers();
            setUsers(data);
        } catch {
            setUsers([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Usuarios</h1>
                </div>
                <AddUserDialog />
            </div>

            {isLoading ? (
                <div className="text-center py-12 glass rounded-xl">
                    <p className="text-slate-400 text-sm">Cargando...</p>
                </div>
            ) : (
                <UsersTable users={users} />
            )}
        </div>
    );
}
