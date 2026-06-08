"use client";

import { useState, useEffect, useCallback } from "react";
import { getSalas } from "@/actions/salas";
import { Sala } from "@/types/api";
import SalasTable from "@/components/SalasTable";
import AddSalaDialog from "@/components/AddSalaDialog";

export default function SalasPage() {
    const [salas, setSalas] = useState<Sala[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const refresh = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getSalas();
            setSalas(data);
        } catch {
            setSalas([]);
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
                    <h1 className="text-2xl font-bold text-slate-800">Salas</h1>
                </div>
                <AddSalaDialog onSuccess={refresh} />
            </div>

            {isLoading ? (
                <div className="text-center py-12 glass rounded-xl">
                    <p className="text-slate-400 text-sm">Cargando...</p>
                </div>
            ) : (
                <SalasTable
                    salas={salas}
                    onSuccess={refresh}
                />
            )}
        </div>
    );
}
