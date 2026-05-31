"use client";

import { useState } from "react";
import { Clock, CalendarDays, MapPin, User, DollarSign, QrCode, XCircle, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { MiClaseIndividual, MiSuscripcion, InstanciaEnSuscripcion, Disciplina } from "@/types/api";
import { crearPreferenciaDeudaMP } from "@/actions/pagos";

const DISCIPLINA_LABELS: Record<Disciplina, string> = {
    [Disciplina.YOGA]: "Yoga",
    [Disciplina.PILATES]: "Pilates",
    [Disciplina.FUNCIONAL]: "Funcional",
};

const DIA_LABELS: Record<string, string> = {
    lunes: "Lunes", martes: "Martes", miercoles: "Miércoles",
    jueves: "Jueves", viernes: "Viernes", sabado: "Sábado", domingo: "Domingo",
};

const fmtFecha      = new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", month: "short" });
const fmtFechaLarga = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric" });
const fmtPrice      = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 });

function formatTime(t: string) { return t.slice(0, 5); }

function formatFecha(fechaStr: string): string {
    const [y, m, d] = fechaStr.split("-").map(Number);
    return fmtFecha.format(new Date(y, m - 1, d));
}

function formatFechaLarga(fechaStr: string): string {
    const [y, m, d] = fechaStr.split("-").map(Number);
    return fmtFechaLarga.format(new Date(y, m - 1, d));
}

function formatPrice(n: number) {
    return fmtPrice.format(n);
}

function isClaseUpcoming(fechaStr: string, horaInicioStr: string): boolean {
    const [y, m, d] = fechaStr.split("-").map(Number);
    const [h, min] = horaInicioStr.split(":").map(Number);
    return new Date(y, m - 1, d, h, min) > new Date();
}

function isFechaUpcoming(fechaStr: string): boolean {
    const [y, m, d] = fechaStr.split("-").map(Number);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return new Date(y, m - 1, d) >= today;
}

// ─── Individual: card ────────────────────────────────────────────────────────

function ClaseIndividualCard({ clase }: { clase: MiClaseIndividual }) {
    const [paying, setPaying] = useState(false);
    const [payError, setPayError] = useState("");
    const upcoming = isClaseUpcoming(clase.fecha, clase.hora_inicio);

    const montoRestante =
        clase.precio_clase !== null && clase.monto_pagado !== null
            ? clase.precio_clase - clase.monto_pagado
            : 0;
    const tieneDeuda = !clase.cancelo && montoRestante > 0;

    async function handleSaldarDeuda() {
        setPaying(true);
        setPayError("");
        const result = await crearPreferenciaDeudaMP(clase.asistencia_id);
        if (result.error) {
            setPaying(false);
            setPayError(result.error);
            return;
        }
        if (result.init_point) {
            window.location.href = result.init_point;
        }
    }

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
                    <span>
                        Abonado: <span className="font-semibold text-slate-700">{formatPrice(clase.monto_pagado)}</span>
                        {tieneDeuda && clase.precio_clase !== null && (
                            <span className="ml-1 text-cef-warning">/ {formatPrice(clase.precio_clase)}</span>
                        )}
                    </span>
                </div>
            )}

            {tieneDeuda && (
                <div className="space-y-1.5 pt-1 border-t border-slate-100">
                    {payError && (
                        <p className="text-xs text-cef-danger flex items-center gap-1">
                            <AlertCircle size={12} className="flex-shrink-0" />
                            {payError}
                        </p>
                    )}
                    <button
                        type="button"
                        onClick={handleSaldarDeuda}
                        disabled={paying}
                        className="w-full py-2 px-3 rounded-lg bg-cef-warning/10 hover:bg-cef-warning/20 text-cef-warning border border-cef-warning/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60"
                    >
                        {paying ? (
                            <><Loader2 size={12} className="animate-spin" />Redirigiendo...</>
                        ) : (
                            <>Saldar deuda — {formatPrice(montoRestante)}</>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Suscripcion: instancia row ───────────────────────────────────────────────

function InstanciaRow({ inst }: { inst: InstanciaEnSuscripcion }) {
    const upcoming = isFechaUpcoming(inst.fecha);

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
                            Clases del período: {s.instancias.length} {s.instancias.length === 1 ? "clase" : "clases"}
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

// ─── Shared UI helpers ───────────────────────────────────────────────────────

function PillTabs<T extends string>({
    options,
    active,
    onChange,
}: {
    options: { value: T; label: string }[];
    active: T;
    onChange: (v: T) => void;
}) {
    return (
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
            {options.map(({ value, label }) => (
                <button
                    key={value}
                    type="button"
                    onClick={() => onChange(value)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        active === value
                            ? "bg-white text-slate-800 shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                    }`}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="glass rounded-2xl p-10 text-center">
            <p className="text-slate-400 text-sm">{message}</p>
        </div>
    );
}

// ─── Main view ────────────────────────────────────────────────────────────────

type TopTab = "individuales" | "suscripciones";
type SubTab = "proximas" | "pasadas";

export default function MisClasesView({
    individuales,
    suscripciones,
}: {
    individuales: MiClaseIndividual[];
    suscripciones: MiSuscripcion[];
}) {
    const [topTab, setTopTab] = useState<TopTab>("individuales");
    const [subTabInd, setSubTabInd] = useState<SubTab>("proximas");
    const [subTabSus, setSubTabSus] = useState<SubTab>("proximas");

    const today = new Date(); today.setHours(0, 0, 0, 0);

    const indProximas = individuales.filter(c => isClaseUpcoming(c.fecha, c.hora_inicio));
    const indPasadas  = individuales.filter(c => !isClaseUpcoming(c.fecha, c.hora_inicio));
    const indLista    = subTabInd === "proximas" ? indProximas : indPasadas;

    const susActivas = suscripciones.filter(s => s.activo && new Date(s.fecha_fin + "T12:00:00") >= today);
    const susPasadas = suscripciones.filter(s => !s.activo || new Date(s.fecha_fin + "T12:00:00") < today);
    const susLista   = subTabSus === "proximas" ? susActivas : susPasadas;

    return (
        <div className="space-y-6">
            {/* ── Pestañas principales ── */}
            <PillTabs
                options={[
                    { value: "individuales", label: `Individuales` },
                    { value: "suscripciones", label: `Suscripciones` },
                ]}
                active={topTab}
                onChange={setTopTab}
            />

            {/* ── Individuales ── */}
            {topTab === "individuales" && (
                <section className="space-y-4">
                    <PillTabs
                        options={[
                            { value: "proximas", label: `Próximas (${indProximas.length})` },
                            { value: "pasadas",  label: `Pasadas (${indPasadas.length})` },
                        ]}
                        active={subTabInd}
                        onChange={setSubTabInd}
                    />
                    {indLista.length === 0 ? (
                        <EmptyState
                            message={
                                subTabInd === "proximas"
                                    ? "No tenés clases individuales próximas."
                                    : "No tenés clases individuales pasadas."
                            }
                        />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {indLista.map(c => <ClaseIndividualCard key={c.asistencia_id} clase={c} />)}
                        </div>
                    )}
                </section>
            )}

            {/* ── Suscripciones ── */}
            {topTab === "suscripciones" && (
                <section className="space-y-4">
                    <PillTabs
                        options={[
                            { value: "proximas", label: `Activas (${susActivas.length})` },
                            { value: "pasadas",  label: `Pasadas (${susPasadas.length})` },
                        ]}
                        active={subTabSus}
                        onChange={setSubTabSus}
                    />
                    {susLista.length === 0 ? (
                        <EmptyState
                            message={
                                subTabSus === "proximas"
                                    ? "No tenés suscripciones activas."
                                    : "No tenés suscripciones pasadas."
                            }
                        />
                    ) : (
                        <div className="space-y-4">
                            {susLista.map(s => <SuscripcionCard key={s.id} suscripcion={s} />)}
                        </div>
                    )}
                </section>
            )}
        </div>
    );
}
