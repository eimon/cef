"use client";

import { useState, useEffect, useCallback } from "react";
import { getClases } from "@/actions/clases";
import { ClaseTemplate } from "@/types/api";
import PreciosTable from "@/components/PreciosTable";

export default function PreciosPage() {
    const [clases, setClases] = useState<ClaseTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            const data = await getClases();
            setClases(data);
        } catch {
            setClases([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Configuración de precios</h1>
                <p className="text-sm text-slate-400 mt-1">Modificá el precio de mensualidad o clase individual por disciplina.</p>
            </div>

            {isLoading ? (
                <div className="text-center py-12 glass rounded-xl">
                    <p className="text-slate-400 text-sm">Cargando...</p>
                </div>
            ) : (
                <PreciosTable clases={clases} onSuccess={refresh} />
            )}
        </div>
    );
}
