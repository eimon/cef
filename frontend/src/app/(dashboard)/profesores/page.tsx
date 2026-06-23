"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import { getProfesores, GetProfesoresParams } from "@/actions/profesores";
import { Profesor } from "@/types/api";
import ProfesoresTable from "@/components/ProfesoresTable";
import AddProfesorDialog from "@/components/AddProfesorDialog";
import LicenciasSection from "@/components/LicenciasSection";

export default function ProfesoresPage() {
    const [profesores, setProfesores] = useState<Profesor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filters, setFilters] = useState<GetProfesoresParams>({ dni: "", nombre: "", apellido: "" });

    const hasActiveFilter = Boolean(filters.dni?.trim() || filters.nombre?.trim() || filters.apellido?.trim());

    const refresh = useCallback(async (params: GetProfesoresParams = {}) => {
        setIsLoading(true);
        try {
            const data = await getProfesores(params);
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
                    <h1 className="text-2xl font-bold text-slate-800">Profesores</h1>
                </div>
                <AddProfesorDialog onSuccess={() => refresh(filters)} />
            </div>

            <form onSubmit={handleSearch} className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto] items-end">
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
                <div>
                    <label className="block text-sm font-medium text-slate-700">DNI</label>
                    <input
                        value={filters.dni}
                        onChange={(event) => setFilters((prev) => ({ ...prev, dni: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-cef-primary focus:outline-none focus:ring-2 focus:ring-cef-primary/20"
                        placeholder="Buscar por DNI"
                    />
                </div>
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
                <>
                    <ProfesoresTable
                        profesores={profesores}
                        onSuccess={() => refresh(filters)}
                        emptyMessage={hasActiveFilter ? "No se encontraron profesores con los filtros ingresados" : undefined}
                    />
                    <LicenciasSection profesores={profesores} />
                </>
            )}
        </div>
    );
}
