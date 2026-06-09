"use client";

import { useState, useEffect, useCallback } from "react";
import { getDisciplinas } from "@/actions/disciplinas";
import { DisciplinaItem } from "@/types/api";
import DisciplinasTable from "@/components/DisciplinasTable";
import AddDisciplinaDialog from "@/components/AddDisciplinaDialog";

export default function DisciplinasPage() {
    const [disciplinas, setDisciplinas] = useState<DisciplinaItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const refresh = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getDisciplinas();
            setDisciplinas(data);
        } catch {
            setDisciplinas([]);
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
                    <h1 className="text-2xl font-bold text-slate-800">Disciplinas</h1>
                </div>
                <AddDisciplinaDialog onSuccess={refresh} />
            </div>

            {isLoading ? (
                <div className="text-center py-12 glass rounded-xl">
                    <p className="text-slate-400 text-sm">Cargando...</p>
                </div>
            ) : (
                <DisciplinasTable
                    disciplinas={disciplinas}
                    onSuccess={refresh}
                />
            )}
        </div>
    );
}
