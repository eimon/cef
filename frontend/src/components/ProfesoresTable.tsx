"use client";

import { useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { Profesor } from "@/types/api";
import EditProfesorDialog from "@/components/EditProfesorDialog";
import DeleteProfesorDialog from "@/components/DeleteProfesorDialog";

const DISCIPLINAS_VISIBLE = 2;

interface ProfesoresTableProps {
    profesores: Profesor[];
    onSuccess: () => void;
    emptyMessage?: string;
}

function DisciplinasModal({ profesor, onClose }: { profesor: Profesor; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="glass-modal rounded-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                    <div>
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">Disciplinas</p>
                        <h3 className="text-sm font-semibold text-slate-800">
                            {profesor.nombre} {profesor.apellido}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                        {profesor.disciplinas.map((d) => (
                            <span
                                key={d}
                                className="px-3 py-1 rounded-full text-xs font-medium bg-cef-primary/10 text-cef-primary capitalize"
                            >
                                {d}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="px-5 pb-4 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}

function DisciplinasCell({ disciplinas, onShowAll }: { disciplinas: string[]; onShowAll: () => void }) {
    if (!disciplinas?.length) return <span className="text-slate-300">—</span>;

    const visible = disciplinas.slice(0, DISCIPLINAS_VISIBLE);
    const hidden = disciplinas.length - DISCIPLINAS_VISIBLE;

    return (
        <div className="flex flex-wrap gap-1 items-center">
            {visible.map((d) => (
                <span key={d} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-cef-primary/10 text-cef-primary capitalize">
                    {d}
                </span>
            ))}
            {hidden > 0 && (
                <button
                    type="button"
                    onClick={onShowAll}
                    className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                >
                    +{hidden} más
                </button>
            )}
        </div>
    );
}

export default function ProfesoresTable({ profesores, onSuccess, emptyMessage }: ProfesoresTableProps) {
    const [profesorToEdit, setProfesorToEdit] = useState<Profesor | null>(null);
    const [profesorToDelete, setProfesorToDelete] = useState<Profesor | null>(null);
    const [profesorDisciplinas, setProfesorDisciplinas] = useState<Profesor | null>(null);

    if (profesores.length === 0) {
        return (
            <div className="text-center py-12 glass rounded-xl border-dashed">
                <p className="text-slate-400 text-sm">{emptyMessage ?? "No se encontraron profesores."}</p>
            </div>
        );
    }

    return (
        <>
            {/* ── Mobile: cards ── */}
            <div className="flex flex-col gap-3 md:hidden">
                {profesores.map((profesor) => (
                    <div key={profesor.id} className="glass rounded-xl px-4 py-3.5">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center flex-wrap gap-1.5 mb-1.5">
                                    <span className="text-sm font-semibold text-slate-700">
                                        {profesor.nombre} {profesor.apellido}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 capitalize">
                                        {profesor.genero ?? "—"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-400 mb-1.5">
                                    <span>DNI: {profesor.dni}</span>
                                    {profesor.email && (
                                        <>
                                            <span className="text-slate-200">·</span>
                                            <span>{profesor.email}</span>
                                        </>
                                    )}
                                </div>
                                <DisciplinasCell
                                    disciplinas={profesor.disciplinas ?? []}
                                    onShowAll={() => setProfesorDisciplinas(profesor)}
                                />
                            </div>
                            <div className="flex gap-1 shrink-0">
                                <button
                                    onClick={() => setProfesorToEdit(profesor)}
                                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <Pencil size={14} />
                                </button>
                                <button
                                    onClick={() => setProfesorToDelete(profesor)}
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
                                    Apellido
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    DNI
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Género
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Disciplinas
                                </th>
                                <th scope="col" className="px-6 py-3" />
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
                                    <td className="px-6 py-4 text-sm">
                                        <DisciplinasCell
                                            disciplinas={profesor.disciplinas ?? []}
                                            onShowAll={() => setProfesorDisciplinas(profesor)}
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => setProfesorToEdit(profesor)}
                                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                onClick={() => setProfesorToDelete(profesor)}
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

            {profesorDisciplinas && (
                <DisciplinasModal
                    profesor={profesorDisciplinas}
                    onClose={() => setProfesorDisciplinas(null)}
                />
            )}

            {profesorToEdit && (
                <EditProfesorDialog
                    key={profesorToEdit.id}
                    profesor={profesorToEdit}
                    isOpen={true}
                    onClose={() => setProfesorToEdit(null)}
                    onSuccess={() => { setProfesorToEdit(null); onSuccess(); }}
                />
            )}

            {profesorToDelete && (
                <DeleteProfesorDialog
                    key={profesorToDelete.id}
                    profesor={profesorToDelete}
                    isOpen={true}
                    onClose={() => setProfesorToDelete(null)}
                    onSuccess={() => { setProfesorToDelete(null); onSuccess(); }}
                />
            )}
        </>
    );
}
