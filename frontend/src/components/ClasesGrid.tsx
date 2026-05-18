"use client";

import { useState } from "react";
import { Clock, CalendarDays } from "lucide-react";
import { ClaseSemana, DiaSemana } from "@/types/api";
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

export default function ClasesGrid({ clases }: { clases: ClaseSemana[] }) {
    const [selectedClase, setSelectedClase] = useState<ClaseSemana | null>(null);

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
                    const label = DIA_LABELS[dia] ?? dia;
                    const fechaCorta = formatFechaCorta(clasesDelDia[0].fecha_en_semana);

                    return (
                        <div key={dia} className="space-y-4 animate-in fade-in duration-300">
                            {/* Day Header */}
                            <div className="flex items-center gap-3 pb-2 border-b border-white/[0.07]">
                                <div className="p-2 rounded-lg bg-white/[0.05] border border-white/[0.05] text-white/70">
                                    <CalendarDays size={18} />
                                </div>
                                <h2 className="text-lg font-bold text-white/90 tracking-tight">
                                    {label}
                                </h2>
                                <span className="text-sm text-white/40 font-medium">
                                    {fechaCorta}
                                </span>
                                <span className="ml-auto px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/[0.05] text-white/60">
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
                                        <div className={`h-1.5 w-full bg-gradient-to-r ${accentBg}`} />

                                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block mb-1">
                                                    Actividad
                                                </span>
                                                <h3 className="text-base font-bold text-white/90 group-hover:text-white transition-colors tracking-tight">
                                                    {clase.nombre}
                                                </h3>
                                                {clase.profesor_nombre && (
                                                    <p className="text-xs text-white/40 mt-1 truncate">
                                                        {clase.profesor_nombre}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
                                                <div className="flex items-center gap-2 text-xs font-medium text-white/60">
                                                    <Clock size={14} className="text-white/40" />
                                                    <span>
                                                        {formatTime(clase.hora_inicio)} – {formatTime(clase.hora_fin)}
                                                    </span>
                                                </div>
                                                {clase.instancia?.cancelada && (
                                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-cef-danger/70 bg-cef-danger/10 px-2 py-0.5 rounded-full">
                                                        Cancelada
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
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
            />
        </>
    );
}
