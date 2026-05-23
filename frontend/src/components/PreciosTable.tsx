"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { ClaseTemplate, DiaSemana } from "@/types/api";
import EditClasePrecioDialog from "@/components/EditClasePrecioDialog";

const DIA_LABELS: Record<DiaSemana, string> = {
    lunes: "Lunes",
    martes: "Martes",
    miercoles: "Miércoles",
    jueves: "Jueves",
    viernes: "Viernes",
    sabado: "Sábado",
    domingo: "Domingo",
};

function formatPrecio(value: number) {
    return new Intl.NumberFormat("es-AR").format(value);
}

function formatTime(time: string) {
    return time.slice(0, 5);
}

interface PreciosTableProps {
    clases: ClaseTemplate[];
    onSuccess: () => void;
}

export default function PreciosTable({ clases, onSuccess }: PreciosTableProps) {
    const [claseToEdit, setClaseToEdit] = useState<ClaseTemplate | null>(null);

    if (clases.length === 0) {
        return (
            <div className="text-center py-12 glass rounded-xl border-dashed">
                <p className="text-slate-400 text-sm">No se encontraron clases.</p>
            </div>
        );
    }

    return (
        <>
            {/* ── Mobile: cards ── */}
            <div className="flex flex-col gap-3 md:hidden">
                {clases.map((clase) => (
                    <div key={clase.id} className="glass rounded-xl px-4 py-3.5">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                                <div className="flex items-center flex-wrap gap-1.5 mb-1.5">
                                    <span className="text-sm font-semibold text-slate-700">{clase.nombre}</span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 capitalize">
                                        {DIA_LABELS[clase.dia_semana]}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400 mb-2">
                                    {formatTime(clase.hora_inicio)} – {formatTime(clase.hora_fin)}
                                </p>
                                <div className="flex gap-4 text-xs text-slate-500">
                                    <span>Mensualidad: <strong className="text-slate-700">${formatPrecio(clase.precio_suscripcion)}</strong></span>
                                    <span>Individual: <strong className="text-slate-700">${formatPrecio(clase.precio_individual)}</strong></span>
                                </div>
                            </div>
                            <button
                                onClick={() => setClaseToEdit(clase)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                title="Modificar precio"
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Clase</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Día</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Horario</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Mensualidad</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Clase individual</th>
                                <th className="px-6 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {clases.map((clase) => (
                                <tr key={clase.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-700 capitalize">
                                        {clase.nombre}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {DIA_LABELS[clase.dia_semana]}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {formatTime(clase.hora_inicio)} – {formatTime(clase.hora_fin)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-medium">
                                        ${formatPrecio(clase.precio_suscripcion)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-medium">
                                        ${formatPrecio(clase.precio_individual)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <button
                                            onClick={() => setClaseToEdit(clase)}
                                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                            title="Modificar precio"
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

            {claseToEdit && (
                <EditClasePrecioDialog
                    key={claseToEdit.id}
                    clase={claseToEdit}
                    isOpen={true}
                    onClose={() => setClaseToEdit(null)}
                    onSuccess={() => { setClaseToEdit(null); onSuccess(); }}
                />
            )}
        </>
    );
}
