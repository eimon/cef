"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { PrecioDisciplina } from "@/types/api";
import EditDisciplinaPrecioDialog from "@/components/EditDisciplinaPrecioDialog";

function formatPrecio(value: number) {
    return new Intl.NumberFormat("es-AR").format(value);
}

interface PreciosTableProps {
    precios: PrecioDisciplina[];
    onSuccess: () => void;
}

export default function PreciosTable({ precios, onSuccess }: PreciosTableProps) {
    const [editando, setEditando] = useState<PrecioDisciplina | null>(null);

    if (precios.length === 0) {
        return (
            <div className="text-center py-12 glass rounded-xl border-dashed">
                <p className="text-slate-400 text-sm">No se encontraron disciplinas configuradas.</p>
            </div>
        );
    }

    return (
        <>
            {/* ── Mobile: cards ── */}
            <div className="flex flex-col gap-3 md:hidden">
                {precios.map((p) => (
                    <div key={p.disciplina} className="glass rounded-xl px-4 py-3.5">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-slate-700 mb-2">
                                    {p.disciplina.charAt(0).toUpperCase() + p.disciplina.slice(1)}
                                </p>
                                <div className="flex gap-4 text-xs text-slate-500">
                                    <span>Mensualidad: <strong className="text-slate-700">${formatPrecio(p.precio_suscripcion)}</strong></span>
                                    <span>Individual: <strong className="text-slate-700">${formatPrecio(p.precio_individual)}</strong></span>
                                </div>
                            </div>
                            <button
                                onClick={() => setEditando(p)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                title="Modificar precios"
                            >
                                <Pencil size={14} />
                            </button>
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Disciplina</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Mensualidad</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Clase individual</th>
                                <th className="px-6 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {precios.map((p) => (
                                <tr key={p.disciplina} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">
                                        {p.disciplina.charAt(0).toUpperCase() + p.disciplina.slice(1)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-medium">
                                        ${formatPrecio(p.precio_suscripcion)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-medium">
                                        ${formatPrecio(p.precio_individual)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <button
                                            onClick={() => setEditando(p)}
                                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                            title="Modificar precios"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {editando && (
                <EditDisciplinaPrecioDialog
                    key={editando.disciplina}
                    precio={editando}
                    isOpen={true}
                    onClose={() => setEditando(null)}
                    onSuccess={() => { setEditando(null); onSuccess(); }}
                />
            )}
        </>
    );
}
