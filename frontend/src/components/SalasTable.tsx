"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Sala } from "@/types/api";
import EditSalaDialog from "@/components/EditSalaDialog";
import DeleteSalaDialog from "@/components/DeleteSalaDialog";

interface SalasTableProps {
    salas: Sala[];
    onSuccess: () => void;
    emptyMessage?: string;
}

export default function SalasTable({ salas, onSuccess, emptyMessage }: SalasTableProps) {
    const [salaToEdit, setSalaToEdit] = useState<Sala | null>(null);
    const [salaToDelete, setSalaToDelete] = useState<Sala | null>(null);

    if (salas.length === 0) {
        return (
            <div className="text-center py-12 glass rounded-xl border-dashed">
                <p className="text-slate-400 text-sm">{emptyMessage ?? "No se encontraron salas."}</p>
            </div>
        );
    }

    return (
        <>
            {/* ── Mobile: cards ── */}
            <div className="flex flex-col gap-3 md:hidden">
                {salas.map((sala) => (
                    <div key={sala.id} className="glass rounded-xl px-4 py-3.5">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <div className="flex items-center flex-wrap gap-1.5 mb-1.5">
                                    <span className="text-sm font-semibold text-slate-700">
                                        {sala.nombre}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                                        Cupo: {sala.capacidad}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                                <button
                                    onClick={() => setSalaToEdit(sala)}
                                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <Pencil size={14} />
                                </button>
                                <button
                                    onClick={() => setSalaToDelete(sala)}
                                    className="p-1.5 rounded-lg hover:bg-cef-danger/10 text-slate-400 hover:text-cef-danger transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
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
                                    Cupo Máximo
                                </th>
                                <th scope="col" className="px-6 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {salas.map((sala) => (
                                <tr key={sala.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">
                                        {sala.nombre}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {sala.capacidad}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => setSalaToEdit(sala)}
                                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                onClick={() => setSalaToDelete(sala)}
                                                className="p-1.5 rounded-lg hover:bg-cef-danger/10 text-slate-400 hover:text-cef-danger transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {salaToEdit && (
                <EditSalaDialog
                    key={salaToEdit.id}
                    sala={salaToEdit}
                    isOpen={true}
                    onClose={() => setSalaToEdit(null)}
                    onSuccess={() => { setSalaToEdit(null); onSuccess(); }}
                />
            )}

            {salaToDelete && (
                <DeleteSalaDialog
                    key={salaToDelete.id}
                    sala={salaToDelete}
                    isOpen={true}
                    onClose={() => setSalaToDelete(null)}
                    onSuccess={() => { setSalaToDelete(null); onSuccess(); }}
                />
            )}
        </>
    );
}
