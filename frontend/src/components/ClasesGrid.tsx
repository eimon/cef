"use client";

import { useState } from "react";
import { Clock, CalendarDays } from "lucide-react";
import { ClaseTemplate, DiaSemana } from "@/types/api";
import ClaseDetailDialog from "@/components/ClaseDetailDialog";

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
    lunes: "from-indigo-500/30 via-indigo-500/10 to-transparent",
    martes: "from-emerald-500/30 via-emerald-500/10 to-transparent",
    miercoles: "from-amber-500/30 via-amber-500/10 to-transparent",
    jueves: "from-sky-500/30 via-sky-500/10 to-transparent",
    viernes: "from-rose-500/30 via-rose-500/10 to-transparent",
    sabado: "from-violet-500/30 via-violet-500/10 to-transparent",
    domingo: "from-slate-500/30 via-slate-500/10 to-transparent",
};

const DIA_BORDER: Record<string, string> = {
    lunes: "border-indigo-500/30",
    martes: "border-emerald-500/30",
    miercoles: "border-amber-500/30",
    jueves: "border-sky-500/30",
    viernes: "border-rose-500/30",
    sabado: "border-violet-500/30",
    domingo: "border-slate-500/30",
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

export default function ClasesGrid({ clases }: { clases: ClaseTemplate[] }) {
    const [selectedClase, setSelectedClase] = useState<ClaseTemplate | null>(null);

    if (clases.length === 0) {
        return (
            <div className="glass rounded-2xl p-12 text-center border border-white/[0.05]">
                <p className="text-white/40 text-sm">No hay clases disponibles en este momento.</p>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-10">
                {DIAS_ORDER.map((dia) => {
                    const clasesDelDia = clases.filter((c) => c.dia_semana === dia);

                    if (clasesDelDia.length === 0) return null;

                    const accentBg = DIA_COLORS[dia] ?? "from-white/10 to-transparent";
                    const accentBorder = DIA_BORDER[dia] ?? "border-white/10";
                    const label = DIA_LABELS[dia] ?? dia;

                    return (
                        <div key={dia} className="space-y-4 animate-in fade-in duration-300">
                            {/* Day Header */}
                            <div className="flex items-center gap-3 pb-2 border-b border-white/[0.07]">
                                <div className="p-2 rounded-lg bg-white/[0.05] border border-white/[0.05] text-white/70">
                                    <CalendarDays size={18} />
                                </div>
                                <h2 className="text-lg font-bold text-white/90 tracking-tight capitalize">
                                    {label}
                                </h2>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/[0.05] text-white/60">
                                    {clasesDelDia.length} {clasesDelDia.length === 1 ? "clase" : "clases"}
                                </span>
                            </div>

                            {/* Cards Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {clasesDelDia.map((clase) => (
                                    <button
                                        key={clase.id}
                                        type="button"
                                        onClick={() => setSelectedClase(clase)}
                                        className="glass rounded-2xl overflow-hidden border border-white/[0.07] hover:border-white/[0.2] hover:bg-white/[0.04] hover:shadow-2xl hover:shadow-white/5 transition-all duration-300 text-left flex flex-col group cursor-pointer"
                                    >
                                        {/* Header accent gradient */}
                                        <div className={`h-1.5 w-full bg-gradient-to-r ${accentBg}`} />

                                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                                            {/* Activity Title */}
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block mb-1">
                                                    Actividad
                                                </span>
                                                <h3 className="text-base font-bold text-white/90 group-hover:text-white transition-colors tracking-tight">
                                                    {clase.nombre}
                                                </h3>
                                            </div>

                                            {/* Schedule row */}
                                            <div className="flex items-center gap-2 text-xs font-medium text-white/60 pt-2 border-t border-white/[0.05]">
                                                <Clock size={14} className="text-white/40" />
                                                <span>
                                                    {formatTime(clase.hora_inicio)} – {formatTime(clase.hora_fin)}
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Popup Modal */}
            <ClaseDetailDialog
                clase={selectedClase}
                isOpen={selectedClase !== null}
                onClose={() => setSelectedClase(null)}
            />
        </>
    );
}
