"use client";

import { useState, useEffect, useCallback } from "react";
import { getProfesores } from "@/actions/profesores";
import { Profesor } from "@/types/api";
import ProfesoresTable from "@/components/ProfesoresTable";
import AddProfesorDialog from "@/components/AddProfesorDialog";
import EditProfesorByDniDialog from "@/components/EditProfesorByDniDialog";
import DeleteProfesorDialog from "@/components/DeleteProfesorDialog";

export default function ProfesoresPage() {
    const [profesores, setProfesores] = useState<Profesor[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            const data = await getProfesores();
            setProfesores(data);
        } catch {
            setProfesores([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Profesores</h1>
                </div>
                <div className="flex items-center gap-2">
                    <DeleteProfesorDialog onSuccess={refresh} />
                    <EditProfesorByDniDialog onSuccess={refresh} />
                    <AddProfesorDialog onSuccess={refresh} />
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-12 glass rounded-xl">
                    <p className="text-slate-400 text-sm">Cargando...</p>
                </div>
            ) : (
                <ProfesoresTable profesores={profesores} />
            )}
        </div>
    );
}
