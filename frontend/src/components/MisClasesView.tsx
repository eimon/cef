"use client";

import { useState } from "react";
import { Clock, CalendarDays, MapPin, User, DollarSign, QrCode, XCircle, CheckCircle2, AlertCircle } from "lucide-react";
import { MiClaseIndividual, MiSuscripcion, InstanciaEnSuscripcion, Disciplina } from "@/types/api";

const DISCIPLINA_LABELS: Record<Disciplina, string> = {
    [Disciplina.YOGA]: "Yoga",
    [Disciplina.PILATES]: "Pilates",
    [Disciplina.FUNCIONAL]: "Funcional",
};

const DIA_LABELS: Record<string, string> = {
    lunes: "Lunes", martes: "Martes", miercoles: "Miércoles",
    jueves: "Jueves", viernes: "Viernes", sabado: "Sábado", domingo: "Domingo",
};

function formatTime(t: string) { return t.slice(0, 5); }

function formatFecha(fechaStr: string): string {
    const [y, m, d] = fechaStr.split("-").map(Number);
    return new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", month: "short" })
        .format(new Date(y, m - 1, d));
}

function formatFechaLarga(fechaStr: string): string {
    const [y, m, d] = fechaStr.split("-").map(Number);
    return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric" })
        .format(new Date(y, m - 1, d));
}

function formatPrice(n: number) {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(n);
}

function isFuture(fechaStr: string): boolean {
    const [y, m, d] = fechaStr.split("-").map(Number);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return new Date(y, m - 1, d) > today;
}

// ─── Individual: card ────────────────────────────────────────────────────────

function ClaseIndividualCard({ clase }: { clase: MiClaseIndividual }) {
    const upcoming = isFuture(clase.fecha);
    return (
        <div className="glass rounded-2xl p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                        {DISCIPLINA_LABELS[clase.disciplina] ?? clase.disciplina}
                    </p>
                    <h3 className="text-base font-bold text-slate-800 tracking-tight">{clase.clase_nombre}</h3>
                </div>
                {upcoming ? (
                    <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-cef-primary/10 text-cef-primary border border-cef-primary/20">
                        Próxima
                    </span>
                ) : clase.asistio ? (
                    <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-cef-success/10 text-cef-success border border-cef-success/20">
                        Asistí
                    </span>
                ) : (
                    <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 border border-slate-200">
                        Pasada
                    </span>
                )}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                    <CalendarDays size={13} className="text-slate-400" />
                    {formatFecha(clase.fecha)}
                </span>
                <span className="flex items-center gap-1.5">
                    <Clock size={13} className="text-slate-400" />
                    {formatTime(clase.hora_inicio)} – {formatTime(clase.hora_fin)}
                </span>
                {clase.profesor_nombre && (
                    <span className="flex items-center gap-1.5">
                        <User size={13} className="text-slate-400" />
                        {clase.profesor_nombre}
                    </span>
                )}
                {clase.sala_nombre && (
                    <span className="flex items-center gap-1.5">
                        <MapPin size={13} className="text-slate-400" />
                        {clase.sala_nombre}
                    </span>
                )}
            </div>

            {clase.monto_pagado !== null && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-1 border-t border-slate-100">
                    <DollarSign size={13} className="text-slate-400" />
                    <span>Abonado: <span className="font-semibold text-slate-700">{formatPrice(clase.monto_pagado)}</span></span>
                </div>
            )}
        </div>
    );
}

// ─── Suscripcion: instancia row ───────────────────────────────────────────────

function InstanciaRow({ inst }: { inst: InstanciaEnSuscripcion }) {
    const upcoming = isFuture(inst.fecha);

    return (
        <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
            <div className="flex items-center gap-3">
                {inst.cancelada ? (
                    <AlertCircle size={15} className="text-cef-danger flex-shrink-0" />
                ) : upcoming ? (
                    <CheckCircle2 size={15} className="text-cef-primary flex-shrink-0" />
                ) : (
                    <CheckCircle2 size={15} className="text-slate-300 flex-shrink-0" />
                )}
                <div>
                    <p className="text-sm font-medium text-slate-700 capitalize">{formatFecha(inst.fecha)}</p>
                    {inst.cancelada && (
                        <p className="text-[11px] text-cef-danger">Cancelada</p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    disabled
                    title="Próximamente"
                    className="p-1.5 rounded-lg text-slate-300 cursor-not-allowed"
                >
                    <QrCode size={16} />
                </button>
                <button
                    type="button"
                    disabled
                    title="Próximamente"
                    className="p-1.5 rounded-lg text-slate-300 cursor-not-allowed"
                >
                    <XCircle size={16} />
                </button>
            </div>
        </div>
    );
}

// ─── Suscripcion: card ────────────────────────────────────────────────────────

function SuscripcionCard({ suscripcion: s }: { suscripcion: MiSuscripcion }) {
    const [expanded, setExpanded] = useState(true);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const fin = new Date(s.fecha_fin + "T12:00:00");
    const activa = s.activo && fin >= today;

    return (
        <div className="glass rounded-2xl overflow-hidden">
            {/* Header */}
            <button
                type="button"
                onClick={() => setExpanded(e => !e)}
                className="w-full text-left px-5 pt-5 pb-4 flex items-start justify-between gap-4"
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            {DISCIPLINA_LABELS[s.disciplina] ?? s.disciplina}
                        </span>
                        {activa ? (
                            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-cef-success/10 text-cef-success border border-cef-success/20">
                                Activa
                            </span>
                        ) : (
                            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 border border-slate-200">
                                Vencida
                            </span>
                        )}
                    </div>
                    <h3 className="text-base font-bold text-slate-800 tracking-tight">{s.clase_nombre}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5">
                            <CalendarDays size={13} className="text-slate-400" />
                            {DIA_LABELS[s.dia_semana] ?? s.dia_semana}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <Clock size={13} className="text-slate-400" />
                            {formatTime(s.hora_inicio)} – {formatTime(s.hora_fin)}
                        </span>
                        {s.profesor_nombre && (
                            <span className="flex items-center gap-1.5">
                                <User size={13} className="text-slate-400" />
                                {s.profesor_nombre}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span>{formatFechaLarga(s.fecha_inicio)} – {formatFechaLarga(s.fecha_fin)}</span>
                        <span className="flex items-center gap-1">
                            <DollarSign size={12} className="text-slate-400" />
                            <span className="font-semibold text-slate-700">{formatPrice(s.monto)}</span>
                            <span className="text-slate-400">/ mes</span>
                        </span>
                    </div>
                </div>
                <span className="text-slate-400 text-xs mt-1 flex-shrink-0">
                    {expanded ? "▲" : "▼"}
                </span>
            </button>

            {/* Instances list */}
            {expanded && (
                <div className="px-5 pb-4">
                    <div className="border-t border-slate-100 pt-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 py-2">
                            Clases del período — {s.instancias.length} {s.instancias.length === 1 ? "clase" : "clases"}
                        </p>
                        {s.instancias.length === 0 ? (
                            <p className="text-xs text-slate-400 py-2">No hay clases agendadas en este período.</p>
                        ) : (
                            s.instancias.map(inst => (
                                <InstanciaRow key={inst.instancia_id} inst={inst} />
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main view ────────────────────────────────────────────────────────────────

type Tab = "proximas" | "pasadas";

export default function MisClasesView({
    individuales,
    suscripciones,
}: {
    individuales: MiClaseIndividual[];
    suscripciones: MiSuscripcion[];
}) {
    const [tab, setTab] = useState<Tab>("proximas");

    const proximas = individuales.filter(c => isFuture(c.fecha));
    const pasadas = individuales.filter(c => !isFuture(c.fecha));
    const listaActual = tab === "proximas" ? proximas : pasadas;

    return (
        <div className="space-y-10">
            {/* ── Clases individuales ── */}
            <section className="space-y-4">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Clases Individuales</h2>

                {/* Tabs */}
                <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
                    {(["proximas", "pasadas"] as Tab[]).map(t => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setTab(t)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                tab === t
                                    ? "bg-white text-slate-800 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                            }`}
                        >
                            {t === "proximas" ? `Próximas (${proximas.length})` : `Pasadas (${pasadas.length})`}
                        </button>
                    ))}
                </div>

                {listaActual.length === 0 ? (
                    <div className="glass rounded-2xl p-10 text-center">
                        <p className="text-slate-400 text-sm">
                            {tab === "proximas"
                                ? "No tenés clases individuales próximas."
                                : "No tenés clases individuales pasadas."}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {listaActual.map(c => (
                            <ClaseIndividualCard key={c.asistencia_id} clase={c} />
                        ))}
                    </div>
                )}
            </section>

            {/* ── Suscripciones ── */}
            <section className="space-y-4">
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Mis Suscripciones</h2>

                {suscripciones.length === 0 ? (
                    <div className="glass rounded-2xl p-10 text-center">
                        <p className="text-slate-400 text-sm">No tenés suscripciones activas.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {suscripciones.map(s => (
                            <SuscripcionCard key={s.id} suscripcion={s} />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
