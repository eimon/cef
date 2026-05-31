"use client";

import { useState } from "react";
import { Clock, CalendarDays, DollarSign, AlertCircle, Loader2 } from "lucide-react";
import { MiClaseIndividual, MiSuscripcion, Disciplina } from "@/types/api";
import { crearPreferenciaDeudaMP } from "@/actions/pagos";

// ─── Unified item ─────────────────────────────────────────────────────────────

type TipoItem = "individual" | "suscripcion";

type MisClasesItem = {
    key: string;
    tipo: TipoItem;
    clase_nombre: string;
    disciplina: Disciplina;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
    profesor_nombre: string | null;
    cancelada: boolean;
    // individual only
    asistencia_id?: string;
    monto_pagado?: number | null;
    precio_clase?: number | null;
    asistio?: boolean;
};

function buildItems(
    individuales: MiClaseIndividual[],
    suscripciones: MiSuscripcion[],
): MisClasesItem[] {
    return [
        ...individuales.map((c): MisClasesItem => ({
            key: c.asistencia_id,
            tipo: "individual",
            clase_nombre: c.clase_nombre,
            disciplina: c.disciplina,
            fecha: c.fecha,
            hora_inicio: c.hora_inicio,
            hora_fin: c.hora_fin,
            profesor_nombre: c.profesor_nombre,
            cancelada: c.cancelo,
            asistencia_id: c.asistencia_id,
            monto_pagado: c.monto_pagado,
            precio_clase: c.precio_clase,
            asistio: c.asistio,
        })),
        ...suscripciones.flatMap(s =>
            s.instancias.map((inst): MisClasesItem => ({
                key: inst.instancia_id,
                tipo: "suscripcion",
                clase_nombre: s.clase_nombre,
                disciplina: s.disciplina,
                fecha: inst.fecha,
                hora_inicio: s.hora_inicio,
                hora_fin: s.hora_fin,
                profesor_nombre: s.profesor_nombre,
                cancelada: inst.cancelada,
            }))
        ),
    ];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DISCIPLINA_ACCENT: Record<string, string> = {
    yoga: "bg-indigo-400",
    pilates: "bg-emerald-400",
    funcional: "bg-amber-400",
};

const fmtFechaHeader = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" });
const fmtPrice = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 });

function formatTime(t: string) { return t.slice(0, 5); }
function formatPrice(n: number) { return fmtPrice.format(n); }

function formatFechaHeader(fechaStr: string): string {
    const [y, m, d] = fechaStr.split("-").map(Number);
    return fmtFechaHeader.format(new Date(y, m - 1, d));
}

function formatFechaCorta(fechaStr: string): string {
    const [, mes, dia] = fechaStr.split("-");
    return `${parseInt(dia)}/${parseInt(mes)}`;
}

function isUpcoming(fecha: string, horaInicio: string): boolean {
    const [y, m, d] = fecha.split("-").map(Number);
    const [h, min] = horaInicio.split(":").map(Number);
    return new Date(y, m - 1, d, h, min) > new Date();
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function MiClaseRow({ item }: { item: MisClasesItem }) {
    const [paying, setPaying] = useState(false);
    const [payError, setPayError] = useState("");

    const upcoming = isUpcoming(item.fecha, item.hora_inicio);
    const montoRestante =
        item.precio_clase != null && item.monto_pagado != null
            ? item.precio_clase - item.monto_pagado
            : 0;
    const tieneDeuda = item.tipo === "individual" && !item.cancelada && montoRestante > 0;

    async function handleSaldar() {
        if (!item.asistencia_id) return;
        setPaying(true);
        setPayError("");
        const result = await crearPreferenciaDeudaMP(item.asistencia_id);
        if (result.error) { setPaying(false); setPayError(result.error); return; }
        if (result.init_point) window.location.href = result.init_point;
    }

    const accent = DISCIPLINA_ACCENT[item.disciplina] ?? "bg-slate-400";

    return (
        <div className="glass rounded-xl hover:border-slate-300 hover:shadow-sm transition-all group flex items-stretch overflow-hidden">
            <div className={`w-1 flex-shrink-0 ${accent}`} />
            <div className="flex-1 flex items-center gap-2.5 px-3 py-2.5 min-w-0 flex-wrap sm:flex-nowrap">

                {/* Name + teacher */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 leading-tight truncate">{item.clase_nombre}</p>
                    {item.profesor_nombre && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.profesor_nombre}</p>
                    )}
                </div>

                {/* Time */}
                <span className="flex items-center gap-1 text-xs text-slate-500 flex-shrink-0">
                    <Clock size={11} className="text-slate-400" />
                    {formatTime(item.hora_inicio)}–{formatTime(item.hora_fin)}
                </span>

                {/* Tipo */}
                <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    item.tipo === "individual"
                        ? "bg-slate-100 text-slate-500 border border-slate-200"
                        : "bg-cef-primary/10 text-cef-primary border border-cef-primary/20"
                }`}>
                    {item.tipo === "individual" ? "Individual" : "Suscripción"}
                </span>

                {/* Estado */}
                {item.cancelada && (
                    <span className="text-[10px] font-semibold uppercase text-cef-danger bg-cef-danger/10 px-1.5 py-0.5 rounded-full border border-cef-danger/20 flex-shrink-0">
                        Cancelada
                    </span>
                )}
                {!upcoming && !item.cancelada && item.tipo === "individual" && (
                    item.asistio
                        ? <span className="text-[10px] font-semibold uppercase text-cef-success bg-cef-success/10 px-1.5 py-0.5 rounded-full border border-cef-success/20 flex-shrink-0">Asistí</span>
                        : <span className="text-[10px] font-semibold uppercase text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full border border-slate-200 flex-shrink-0">No asistí</span>
                )}

                {/* Monto — solo cuando hay deuda pendiente */}
                {tieneDeuda && item.monto_pagado != null && item.precio_clase != null && (
                    <span className="text-xs text-slate-500 flex-shrink-0 flex items-center gap-1">
                        <DollarSign size={11} className="text-slate-400" />
                        {formatPrice(item.monto_pagado)}
                        <span className="text-cef-warning">/ {formatPrice(item.precio_clase)}</span>
                    </span>
                )}

                {/* Saldar deuda */}
                {tieneDeuda && (
                    payError
                        ? <span className="text-[10px] text-cef-danger flex items-center gap-1 flex-shrink-0">
                            <AlertCircle size={10} />{payError}
                          </span>
                        : <button
                            type="button"
                            onClick={handleSaldar}
                            disabled={paying}
                            className="flex-shrink-0 py-1 px-2.5 rounded-lg bg-cef-warning/10 hover:bg-cef-warning/20 text-cef-warning border border-cef-warning/20 text-[11px] font-semibold flex items-center gap-1 transition-colors disabled:opacity-60"
                          >
                            {paying ? <Loader2 size={11} className="animate-spin" /> : `Saldar ${formatPrice(montoRestante)}`}
                          </button>
                )}
            </div>
        </div>
    );
}

// ─── Pill tabs ────────────────────────────────────────────────────────────────

function PillTabs<T extends string>({
    options, active, onChange,
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

// ─── Main view ────────────────────────────────────────────────────────────────

type TiempoTab = "proximas" | "pasadas";
type TipoFiltro = "todas" | "individual" | "suscripcion";

export default function MisClasesView({
    individuales,
    suscripciones,
}: {
    individuales: MiClaseIndividual[];
    suscripciones: MiSuscripcion[];
}) {
    const [tiempoTab, setTiempoTab] = useState<TiempoTab>("proximas");
    const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>("todas");

    const allItems = buildItems(individuales, suscripciones);

    const proximasCount = allItems.filter(i => isUpcoming(i.fecha, i.hora_inicio)).length;
    const pasadasCount  = allItems.filter(i => !isUpcoming(i.fecha, i.hora_inicio)).length;

    const byTime = allItems.filter(i =>
        tiempoTab === "proximas" ? isUpcoming(i.fecha, i.hora_inicio) : !isUpcoming(i.fecha, i.hora_inicio)
    );
    const filtered = tipoFiltro === "todas" ? byTime : byTime.filter(i => i.tipo === tipoFiltro);

    const sorted = [...filtered].sort((a, b) => {
        const cmp = a.fecha.localeCompare(b.fecha) || a.hora_inicio.localeCompare(b.hora_inicio);
        return tiempoTab === "proximas" ? cmp : -cmp;
    });

    // Group by date
    const grouped = new Map<string, MisClasesItem[]>();
    for (const item of sorted) {
        const list = grouped.get(item.fecha) ?? [];
        list.push(item);
        grouped.set(item.fecha, list);
    }

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <PillTabs
                    options={[
                        { value: "proximas", label: `Próximas (${proximasCount})` },
                        { value: "pasadas",  label: `Pasadas (${pasadasCount})` },
                    ]}
                    active={tiempoTab}
                    onChange={setTiempoTab}
                />
                <PillTabs
                    options={[
                        { value: "todas",        label: "Todas" },
                        { value: "individual",   label: "Individuales" },
                        { value: "suscripcion",  label: "Suscripciones" },
                    ]}
                    active={tipoFiltro}
                    onChange={setTipoFiltro}
                />
            </div>

            {/* List */}
            {grouped.size === 0 ? (
                <div className="glass rounded-2xl p-10 text-center">
                    <p className="text-slate-400 text-sm">
                        {tiempoTab === "proximas" ? "No tenés clases próximas." : "No tenés clases pasadas."}
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {Array.from(grouped.entries()).map(([fecha, items]) => (
                        <div key={fecha} className="space-y-1.5">
                            <div className="flex items-center gap-3 pb-1 border-b border-slate-200">
                                <div className="p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-500">
                                    <CalendarDays size={15} />
                                </div>
                                <h2 className="text-sm font-bold text-slate-800 tracking-tight capitalize">
                                    {formatFechaHeader(fecha)}
                                </h2>
                                <span className="text-xs text-slate-400 font-medium">{formatFechaCorta(fecha)}</span>
                                <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                                    {items.length}
                                </span>
                            </div>
                            <div className="space-y-1">
                                {items.map(item => <MiClaseRow key={item.key} item={item} />)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
