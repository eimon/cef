"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { DisciplinaItem } from "@/types/api";
import EditDisciplinaAdminDialog from "@/components/EditDisciplinaAdminDialog";
import DeleteDisciplinaDialog from "@/components/DeleteDisciplinaDialog";

interface DisciplinasTableProps {
    disciplinas: DisciplinaItem[];
    onSuccess: () => void;
    emptyMessage?: string;
}

export default function DisciplinasTable({ disciplinas, onSuccess, emptyMessage }: DisciplinasTableProps) {
    const [itemToEdit, setItemToEdit] = useState<DisciplinaItem | null>(null);
    const [itemToDelete, setItemToDelete] = useState<DisciplinaItem | null>(null);

    if (disciplinas.length === 0) {
        return (
            <div className="text-center py-12 glass rounded-xl border-dashed">
                <p className="text-slate-400 text-sm">{emptyMessage ?? "No se encontraron disciplinas."}</p>
            </div>
        );
    }

    return (
        <>
            {/* ── Mobile: cards ── */}
            <div className="flex flex-col gap-3 md:hidden">
                {disciplinas.map((disciplina) => (
                    <div key={disciplina.id} className="glass rounded-xl px-4 py-3.5">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <span className="text-sm font-semibold text-slate-700">
                                    {disciplina.nombre.charAt(0).toUpperCase() + disciplina.nombre.slice(1)}
                                </span>
                            </div>
                            <div className="flex gap-1 shrink-0">
                                <button
                                    onClick={() => setItemToEdit(disciplina)}
                                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <Pencil size={14} />
                                </button>
                                <button
                                    onClick={() => setItemToDelete(disciplina)}
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
                                <th scope="col" className="px-6 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {disciplinas.map((disciplina) => (
                                <tr key={disciplina.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700">
                                        {disciplina.nombre.charAt(0).toUpperCase() + disciplina.nombre.slice(1)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => setItemToEdit(disciplina)}
                                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                onClick={() => setItemToDelete(disciplina)}
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

            {itemToEdit && (
                <EditDisciplinaAdminDialog
                    key={itemToEdit.id}
                    disciplina={itemToEdit}
                    isOpen={true}
                    onClose={() => setItemToEdit(null)}
                    onSuccess={() => { setItemToEdit(null); onSuccess(); }}
                />
            )}

            {itemToDelete && (
                <DeleteDisciplinaDialog
                    key={itemToDelete.id}
                    disciplina={itemToDelete}
                    isOpen={true}
                    onClose={() => setItemToDelete(null)}
                    onSuccess={() => { setItemToDelete(null); onSuccess(); }}
                />
            )}
        </>
    );
}
