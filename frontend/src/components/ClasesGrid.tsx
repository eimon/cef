"use client";

import { useState, useRef, useEffect } from "react";
import { Clock, CalendarDays, Pencil, Trash2, ChevronDown, Check } from "lucide-react";
import { ClaseSemana, DiaSemana, Disciplina } from "@/types/api";
import ClaseDetailDialog from "@/components/ClaseDetailDialog";
import EditClaseDialog from "@/components/EditClaseDialog";
import DeleteClaseDialog from "@/components/DeleteClaseDialog";

const DIA_LABELS: Record<string, string> = {
    domingo: "Domingo",
    lunes: "Lunes",
    martes: "Martes",
    miercoles: "Miércoles",
    jueves: "Jueves",
    viernes: "Viernes",
    sabado: "Sábado",
};

const DIA_LABELS_CORTOS: Record<string, string> = {
    domingo: "Dom",
    lunes: "Lun",
    martes: "Mar",
    miercoles: "Mié",
    jueves: "Jue",
    viernes: "Vie",
    sabado: "Sáb",
};

const DIA_ACCENT: Record<string, string> = {
    domingo: "bg-slate-400",
    lunes: "bg-indigo-400",
    martes: "bg-emerald-400",
    miercoles: "bg-amber-400",
    jueves: "bg-sky-400",
    viernes: "bg-rose-400",
    sabado: "bg-violet-400",
};

const DISCIPLINA_LABELS: Record<Disciplina, string> = {
    [Disciplina.YOGA]: "Yoga",
    [Disciplina.PILATES]: "Pilates",
    [Disciplina.FUNCIONAL]: "Funcional",
};

const DIAS_ORDER: DiaSemana[] = [
    DiaSemana.DOMINGO,
    DiaSemana.LUNES,
    DiaSemana.MARTES,
    DiaSemana.MIERCOLES,
    DiaSemana.JUEVES,
    DiaSemana.VIERNES,
    DiaSemana.SABADO,
];

function formatTime(time: string) {
    return time.slice(0, 5);
}

function formatFechaCorta(fechaStr: string): string {
    const [, mes, dia] = fechaStr.split("-");
    return `${parseInt(dia)}/${parseInt(mes)}`;
}

function DisciplinaDropdown({
    disciplinas,
    value,
    onChange,
}: {
    disciplinas: Disciplina[];
    value: Disciplina | null;
    onChange: (d: Disciplina | null) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const label = value ? (DISCIPLINA_LABELS[value] ?? value) : "Todas las disciplinas";

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    value
                        ? "bg-cef-primary/10 text-cef-primary border-cef-primary/30"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
            >
                {label}
                <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="absolute left-0 top-full mt-1.5 z-20 w-44 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                    {[null, ...disciplinas].map((d) => {
                        const optLabel = d ? (DISCIPLINA_LABELS[d] ?? d) : "Todas las disciplinas";
                        const isSelected = value === d;
                        return (
                            <button
                                key={d ?? "__all__"}
                                type="button"
                                onClick={() => { onChange(d); setOpen(false); }}
                                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors ${
                                    isSelected
                                        ? "bg-cef-primary/10 text-cef-primary"
                                        : "text-slate-600 hover:bg-slate-50"
                                }`}
                            >
                                {optLabel}
                                {isSelected && <Check size={12} />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function ClasesGrid({ clases, userRole, senaMinima }: { clases: ClaseSemana[]; userRole: string | null; senaMinima?: string }) {
    const [selectedClase, setSelectedClase] = useState<ClaseSemana | null>(null);
    const [claseToEdit, setClaseToEdit] = useState<ClaseSemana | null>(null);
    const [claseToDelete, setClaseToDelete] = useState<ClaseSemana | null>(null);
    const [filtroDisciplina, setFiltroDisciplina] = useState<Disciplina | null>(null);
    const [filtroDia, setFiltroDia] = useState<DiaSemana | null>(null);
    const isStaff = userRole === "admin" || userRole === "recepcion";

    const disciplinas = Array.from(new Set(clases.map((c) => c.disciplina))) as Disciplina[];
    const diasConClases = DIAS_ORDER.filter(d => clases.some(c => c.dia_semana === d));

    const clasesFiltradas = clases.filter((c) => {
        if (filtroDisciplina && c.disciplina !== filtroDisciplina) return false;
        if (filtroDia && c.dia_semana !== filtroDia) return false;
        return true;
    });

    if (clases.length === 0) {
        return (
            <div className="glass rounded-2xl p-12 text-center">
                <p className="text-slate-400 text-sm">No hay clases disponibles en este momento.</p>
            </div>
        );
    }

    return (
        <>
            {/* Filtros */}
            <div className="flex flex-wrap gap-x-6 gap-y-2">
                {/* Disciplina */}
                {disciplinas.length > 1 && (
                    <DisciplinaDropdown
                        disciplinas={disciplinas}
                        value={filtroDisciplina}
                        onChange={setFiltroDisciplina}
                    />
                )}

                {/* Día */}
                {diasConClases.length > 1 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                            type="button"
                            onClick={() => setFiltroDia(null)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                                filtroDia === null
                                    ? "bg-cef-primary/10 text-cef-primary border border-cef-primary/30"
                                    : "bg-slate-100 text-slate-500 border border-slate-200 hover:text-slate-700 hover:bg-slate-200"
                            }`}
                        >
                            Todos
                        </button>
                        {diasConClases.map((d) => (
                            <button
                                key={d}
                                type="button"
                                onClick={() => setFiltroDia(filtroDia === d ? null : d)}
                                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                                    filtroDia === d
                                        ? "bg-cef-primary/10 text-cef-primary border border-cef-primary/30"
                                        : "bg-slate-100 text-slate-500 border border-slate-200 hover:text-slate-700 hover:bg-slate-200"
                                }`}
                            >
                                {DIA_LABELS_CORTOS[d]}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Lista por día */}
            <div className="space-y-6">
                {DIAS_ORDER.map((dia) => {
                    const clasesDelDia = clasesFiltradas.filter((c) => c.dia_semana === dia);
                    if (clasesDelDia.length === 0) return null;

                    const accent = DIA_ACCENT[dia] ?? "bg-slate-400";
                    const label = DIA_LABELS[dia] ?? dia;
                    const fechaCorta = formatFechaCorta(clasesDelDia[0].fecha_en_semana);

                    return (
                        <div key={dia} className="space-y-2 animate-in fade-in duration-300">
                            {/* Day header */}
                            <div className="flex items-center gap-3 pb-1 border-b border-slate-200">
                                <div className="p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-500">
                                    <CalendarDays size={15} />
                                </div>
                                <h2 className="text-sm font-bold text-slate-800 tracking-tight">{label}</h2>
                                <span className="text-xs text-slate-400 font-medium">{fechaCorta}</span>
                                <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                                    {clasesDelDia.length}
                                </span>
                            </div>

                            {/* Compact rows */}
                            <div className="space-y-1">
                                {clasesDelDia.map((clase) => (
                                    <div
                                        key={clase.id}
                                        className="glass rounded-xl hover:border-slate-300 hover:shadow-sm transition-all group flex items-stretch overflow-hidden"
                                    >
                                        {/* Color accent */}
                                        <div className={`w-1 flex-shrink-0 ${accent}`} />

                                        {/* Main content — clickable */}
                                        <button
                                            type="button"
                                            onClick={() => setSelectedClase(clase)}
                                            className="flex-1 flex items-center gap-3 px-3 py-2.5 text-left min-w-0"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-800 leading-tight truncate">
                                                    {clase.nombre}
                                                </p>
                                                {clase.profesor_nombre && (
                                                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                                        {clase.profesor_nombre}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className="flex items-center gap-1 text-xs text-slate-500">
                                                    <Clock size={11} className="text-slate-400" />
                                                    {formatTime(clase.hora_inicio)}–{formatTime(clase.hora_fin)}
                                                </span>
                                                {clase.instancia?.cancelada && (
                                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-cef-danger bg-cef-danger/10 px-1.5 py-0.5 rounded-full">
                                                        Cancelada
                                                    </span>
                                                )}
                                            </div>
                                        </button>

                                        {/* Staff actions */}
                                        {isStaff && (
                                            <div className="flex items-center gap-0.5 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    type="button"
                                                    onClick={() => setClaseToEdit(clase)}
                                                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                                    title="Editar"
                                                >
                                                    <Pencil size={12} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setClaseToDelete(clase)}
                                                    className="p-1.5 rounded-lg hover:bg-cef-danger/10 text-slate-400 hover:text-cef-danger transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={12} />
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
                senaMinima={senaMinima ?? "50"}
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
