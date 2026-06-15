"use client";

import { useState } from "react";
import { Clock, CalendarDays, X, Info, CreditCard } from "lucide-react";
import { MiClaseIndividual, MiSuscripcion, Disciplina } from "@/types/api";

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
    deuda_vencida?: boolean;
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
            deuda_vencida: c.deuda_vencida,
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
                deuda_vencida: false,
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

function getClassStart(fecha: string, horaInicio: string): Date {
    const [y, m, d] = fecha.split("-").map(Number);
    const [h, min] = horaInicio.split(":").map(Number);
    return new Date(y, m - 1, d, h, min);
}

function canCompleteDebt(fecha: string, horaInicio: string): boolean {
    const oneDayMs = 24 * 60 * 60 * 1000;
    return getClassStart(fecha, horaInicio).getTime() - Date.now() > oneDayMs;
}

function getBlockedDebtMessage(item: MisClasesItem): string {
    if (!isUpcoming(item.fecha, item.hora_inicio)) {
        return "La clase ya paso. La deuda no se puede completar desde la app.";
    }
    return "Ya no se puede completar el pago desde la app porque faltan menos de 24 horas para la clase.";
}

function DebtDialog({
    item,
    montoRestante,
    onClose,
}: {
    item: MisClasesItem;
    montoRestante: number;
    onClose: () => void;
}) {
    const canPay = Boolean(item.asistencia_id) && canCompleteDebt(item.fecha, item.hora_inicio);

    function handleGoToPayments() {
        window.location.href = "/mis-pagos";
    }

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 px-4 py-6 backdrop-blur-sm">
            <div className="glass-modal w-full max-w-md rounded-2xl p-5 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-cef-warning/20 bg-cef-warning/10 text-cef-warning">
                            <Info size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-800">Deuda pendiente</h3>
                            <p className="mt-1 text-sm text-slate-500">{item.clase_nombre}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                        aria-label="Cerrar"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="mt-5 space-y-3">
                    <div className="rounded-xl border border-slate-200 bg-white/60 p-4">
                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div>
                                <p className="text-[10px] font-semibold uppercase text-slate-400">Abonado</p>
                                <p className="mt-1 text-sm font-bold text-slate-800">{formatPrice(item.monto_pagado ?? 0)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold uppercase text-slate-400">Total</p>
                                <p className="mt-1 text-sm font-bold text-slate-800">{formatPrice(item.precio_clase ?? 0)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold uppercase text-slate-400">Deuda</p>
                                <p className="mt-1 text-sm font-bold text-cef-warning">{formatPrice(montoRestante)}</p>
                            </div>
                        </div>
                    </div>

                    <div className={`rounded-xl border p-3 text-sm ${
                        canPay
                            ? "border-cef-success/20 bg-cef-success/10 text-slate-700"
                            : "border-cef-warning/20 bg-cef-warning/10 text-slate-700"
                    }`}>
                        {canPay
                            ? "Podés completar el pago hasta 24 horas antes del inicio de la clase"
                            : getBlockedDebtMessage(item)}
                    </div>

                </div>

                {canPay && (
                    <div className="mt-5 flex justify-end">
                        <button
                            type="button"
                            onClick={handleGoToPayments}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-cef-warning px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cef-warning/90 disabled:opacity-60"
                        >
                            <CreditCard size={16} />
                            Pagar en Mis Pagos
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function MiClaseRow({ item }: { item: MisClasesItem }) {
    const [debtOpen, setDebtOpen] = useState(false);

    const upcoming = isUpcoming(item.fecha, item.hora_inicio);
    const montoRestante =
        item.precio_clase != null && item.monto_pagado != null
            ? Math.max(item.precio_clase - item.monto_pagado, 0)
            : 0;
    const tieneDeudaParcial =
        item.tipo === "individual" &&
        !item.cancelada &&
        item.monto_pagado != null &&
        item.precio_clase != null &&
        item.monto_pagado > 0 &&
        item.monto_pagado < item.precio_clase;

    const accent = DISCIPLINA_ACCENT[item.disciplina] ?? "bg-slate-400";

    return (
        <>
        <div className="glass flex items-stretch overflow-hidden rounded-xl transition-all hover:border-slate-300 hover:shadow-sm">
            <div className={`w-1 flex-shrink-0 ${accent}`} />
            <div className="min-w-0 flex-1 px-3 py-3 sm:flex sm:flex-wrap sm:items-center sm:gap-2.5 sm:py-2.5 lg:flex-nowrap">

                {/* Name + teacher */}
                <div className="min-w-0 sm:flex-1">
                    <p className="break-words text-sm font-semibold leading-tight text-slate-800">{item.clase_nombre}</p>
                    {item.profesor_nombre && (
                        <p className="mt-1 break-words text-[11px] text-slate-400">{item.profesor_nombre}</p>
                    )}
                </div>

                {/* Time */}
                <span className="mt-2 inline-flex flex-shrink-0 items-center gap-1 text-xs text-slate-500 sm:mt-0">
                    <Clock size={11} className="text-slate-400" />
                    {formatTime(item.hora_inicio)}–{formatTime(item.hora_fin)}
                </span>

                {/* Tipo */}
                <span className={`mt-2 inline-flex flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide sm:mt-0 ${
                    item.tipo === "individual"
                        ? "bg-slate-100 text-slate-500 border border-slate-200"
                        : "bg-cef-primary/10 text-cef-primary border border-cef-primary/20"
                }`}>
                    {item.tipo === "individual" ? "Individual" : "Suscripción"}
                </span>

                {/* Estado */}
                {item.deuda_vencida && (
                    <span className="mt-2 inline-flex flex-shrink-0 rounded-full border border-cef-warning/20 bg-cef-warning/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-cef-warning sm:mt-0">
                        Deuda vencida
                    </span>
                )}
                {item.cancelada && !item.deuda_vencida && (
                    <span className="mt-2 inline-flex flex-shrink-0 rounded-full border border-cef-danger/20 bg-cef-danger/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-cef-danger sm:mt-0">
                        Cancelada
                    </span>
                )}
                {!upcoming && !item.cancelada && item.tipo === "individual" && (
                    item.asistio
                        ? <span className="text-[10px] font-semibold uppercase text-cef-success bg-cef-success/10 px-1.5 py-0.5 rounded-full border border-cef-success/20 flex-shrink-0">Asistí</span>
                        : <span className="text-[10px] font-semibold uppercase text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full border border-slate-200 flex-shrink-0">No asistí</span>
                )}

                {/* Deuda */}
                {tieneDeudaParcial && (
                    <button
                        type="button"
                        onClick={() => setDebtOpen(true)}
                        className="mt-3 flex w-full flex-shrink-0 items-center justify-center gap-1 rounded-lg border border-cef-warning/20 bg-cef-warning/10 px-2.5 py-2 text-[11px] font-semibold text-cef-warning transition-colors hover:bg-cef-warning/20 sm:mt-0 sm:w-auto sm:py-1"
                    >
                        Ver deuda
                    </button>
                )}
            </div>
        </div>

        {debtOpen && (
            <DebtDialog
                item={item}
                montoRestante={montoRestante}
                onClose={() => setDebtOpen(false)}
            />
        )}
        </>
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
        <div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
            {options.map(({ value, label }) => (
                <button
                    key={value}
                    type="button"
                    onClick={() => onChange(value)}
                    className={`whitespace-nowrap rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
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
                        No hay nada que mostrar en este momento
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {Array.from(grouped.entries()).map(([fecha, items]) => (
                        <div key={fecha} className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-1 sm:gap-3">
                                <div className="p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-500">
                                    <CalendarDays size={15} />
                                </div>
                                <h2 className="min-w-0 flex-1 break-words text-sm font-bold capitalize tracking-tight text-slate-800">
                                    {formatFechaHeader(fecha)}
                                </h2>
                                <span className="text-xs text-slate-400 font-medium">{formatFechaCorta(fecha)}</span>
                                <span className="ml-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 sm:ml-auto">
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
