"use client";

import { useState } from "react";
import { Clock, CalendarDays, Pencil, Trash2 } from "lucide-react";
import { ClaseSemana, DiaSemana, Disciplina } from "@/types/api";
import ClaseDetailDialog from "@/components/ClaseDetailDialog";
import EditClaseDialog from "@/components/EditClaseDialog";
import DeleteClaseDialog from "@/components/DeleteClaseDialog";

const DIA_LABELS: Record<string, string> = {
    lunes: "Lunes",
    martes: "Martes",
    miercoles: "Miércoles",
    jueves: "Jueves",
    viernes: "Viernes",
    sabado: "Sábado",
    domingo: "Domingo",
};

const DIA_COLORS: Record<string, string> = {
    lunes: "from-indigo-500/40 via-indigo-500/20 to-transparent",
    martes: "from-emerald-500/40 via-emerald-500/20 to-transparent",
    miercoles: "from-amber-500/40 via-amber-500/20 to-transparent",
    jueves: "from-sky-500/40 via-sky-500/20 to-transparent",
    viernes: "from-rose-500/40 via-rose-500/20 to-transparent",
    sabado: "from-violet-500/40 via-violet-500/20 to-transparent",
    domingo: "from-slate-500/40 via-slate-500/20 to-transparent",
};

const DISCIPLINA_LABELS: Record<Disciplina, string> = {
    [Disciplina.YOGA]: "Yoga",
    [Disciplina.PILATES]: "Pilates",
    [Disciplina.FUNCIONAL]: "Funcional",
};

const DIAS_ORDER: DiaSemana[] = [
    DiaSemana.LUNES,
    DiaSemana.MARTES,
    DiaSemana.MIERCOLES,
    DiaSemana.JUEVES,
    DiaSemana.VIERNES,
    DiaSemana.SABADO,
    DiaSemana.DOMINGO,
];

function formatTime(time: string) {
    return time.slice(0, 5);
}

function formatFechaCorta(fechaStr: string): string {
    const [, mes, dia] = fechaStr.split("-");
    return `${parseInt(dia)}/${parseInt(mes)}`;
}

export default function ClasesGrid({ clases, userRole }: { clases: ClaseSemana[]; userRole: string | null }) {
    const [selectedClase, setSelectedClase] = useState<ClaseSemana | null>(null);
    const [claseToEdit, setClaseToEdit] = useState<ClaseSemana | null>(null);
    const [claseToDelete, setClaseToDelete] = useState<ClaseSemana | null>(null);
    const [filtro, setFiltro] = useState<Disciplina | null>(null);
    const isStaff = userRole === "admin" || userRole === "recepcion";

    const disciplinas = Array.from(new Set(clases.map((c) => c.disciplina))) as Disciplina[];
    const clasesFiltradas = filtro ? clases.filter((c) => c.disciplina === filtro) : clases;

    if (clases.length === 0) {
        return (
            <div className="glass rounded-2xl p-12 text-center">
                <p className="text-slate-400 text-sm">No hay clases disponibles en este momento.</p>
            </div>
        );
    }

    return (
        <>
            {disciplinas.length > 1 && (
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={() => setFiltro(null)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                            filtro === null
                                ? "bg-cef-primary/10 text-cef-primary border border-cef-primary/30"
                                : "bg-slate-100 text-slate-500 border border-slate-200 hover:text-slate-700 hover:bg-slate-200"
                        }`}
                    >
                        Todas
                    </button>
                    {disciplinas.map((d) => (
                        <button
                            key={d}
                            type="button"
                            onClick={() => setFiltro(filtro === d ? null : d)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                filtro === d
                                    ? "bg-cef-primary/10 text-cef-primary border border-cef-primary/30"
                                    : "bg-slate-100 text-slate-500 border border-slate-200 hover:text-slate-700 hover:bg-slate-200"
                            }`}
                        >
                            {DISCIPLINA_LABELS[d]}
                        </button>
                    ))}
                </div>
            )}

            <div className="space-y-10">
                {DIAS_ORDER.map((dia) => {
                    const clasesDelDia = clasesFiltradas.filter((c) => c.dia_semana === dia);
                    if (clasesDelDia.length === 0) return null;

                    const accentBg = DIA_COLORS[dia] ?? "from-slate-500/30 to-transparent";
                    const label = DIA_LABELS[dia] ?? dia;
                    const fechaCorta = formatFechaCorta(clasesDelDia[0].fecha_en_semana);

                    return (
                        <div key={dia} className="space-y-4 animate-in fade-in duration-300">
                            {/* Day Header */}
                            <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
                                <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-500">
                                    <CalendarDays size={18} />
                                </div>
                                <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                                    {label}
                                </h2>
                                <span className="text-sm text-slate-400 font-medium">
                                    {fechaCorta}
                                </span>
                                <span className="ml-auto px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                                    {clasesDelDia.length} {clasesDelDia.length === 1 ? "clase" : "clases"}
                                </span>
                            </div>

                            {/* Cards Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {clasesDelDia.map((clase) => (
                                    <div
                                        key={clase.id}
                                        className="glass rounded-2xl overflow-hidden hover:border-slate-300 hover:shadow-md hover:shadow-slate-100 transition-all duration-300 flex flex-col group relative"
                                    >
                                        <div className={`h-1.5 w-full bg-gradient-to-r ${accentBg}`} />

                                        <button
                                            type="button"
                                            onClick={() => setSelectedClase(clase)}
                                            className="p-5 flex-1 flex flex-col justify-between space-y-4 text-left cursor-pointer"
                                        >
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                                                    Actividad
                                                </span>
                                                <h3 className="text-base font-bold text-slate-800 group-hover:text-slate-900 transition-colors tracking-tight">
                                                    {clase.nombre}
                                                </h3>
                                                {clase.profesor_nombre && (
                                                    <p className="text-xs text-slate-400 mt-1 truncate">
                                                        {clase.profesor_nombre}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                                    <Clock size={14} className="text-slate-400" />
                                                    <span>
                                                        {formatTime(clase.hora_inicio)} – {formatTime(clase.hora_fin)}
                                                    </span>
                                                </div>
                                                {clase.instancia?.cancelada && (
                                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-cef-danger bg-cef-danger/10 px-2 py-0.5 rounded-full">
                                                        Cancelada
                                                    </span>
                                                )}
                                            </div>
                                        </button>

                                        {isStaff && (
                                            <div className="absolute top-3 right-3 flex gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setClaseToEdit(clase)}
                                                    className="p-1.5 rounded-lg bg-white/80 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all shadow-sm"
                                                    title="Editar clase"
                                                >
                                                    <Pencil size={13} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setClaseToDelete(clase)}
                                                    className="p-1.5 rounded-lg bg-white/80 hover:bg-cef-danger/10 text-slate-400 hover:text-cef-danger transition-all shadow-sm"
                                                    title="Eliminar clase"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            <ClaseDetailDialog
                clase={selectedClase}
                isOpen={selectedClase !== null}
                onClose={() => setSelectedClase(null)}
                userRole={userRole}
            />

            {claseToEdit && (
                <EditClaseDialog
                    key={claseToEdit.id}
                    clase={claseToEdit}
                    isOpen={true}
                    onClose={() => setClaseToEdit(null)}
                />
            )}

            {claseToDelete && (
                <DeleteClaseDialog
                    key={claseToDelete.id}
                    clase={claseToDelete}
                    isOpen={true}
                    onClose={() => setClaseToDelete(null)}
                />
            )}
        </>
    );
}
