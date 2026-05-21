"use client";

import { Profesor } from "@/types/api";

interface ProfesoresTableProps {
    profesores: Profesor[];
}

export default function ProfesoresTable({ profesores }: ProfesoresTableProps) {
    if (profesores.length === 0) {
        return (
            <div className="text-center py-12 glass rounded-xl border-dashed">
                <p className="text-slate-400 text-sm">No se encontraron profesores.</p>
            </div>
        );
    }

    return (
        <>
            {/* ── Mobile: cards ── */}
            <div className="flex flex-col gap-3 md:hidden">
                {profesores.map((profesor) => (
                    <div key={profesor.id} className="glass rounded-xl px-4 py-3.5">
                        <div className="flex items-center flex-wrap gap-1.5 mb-1.5">
                            <span className="text-sm font-semibold text-slate-700">
                                {profesor.nombre} {profesor.apellido}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 capitalize">
                                {profesor.genero ?? "—"}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span>DNI: {profesor.dni}</span>
                            {profesor.email && (
                                <>
                                    <span className="text-slate-200">·</span>
                                    <span>{profesor.email}</span>
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
                                    Apellido
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    DNI
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Género
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {profesores.map((profesor) => (
                                <tr key={profesor.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">
                                        {profesor.nombre}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {profesor.apellido}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {profesor.dni}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 capitalize">
                                        {profesor.genero ?? "—"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
