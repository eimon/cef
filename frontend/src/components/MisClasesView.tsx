"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Clock, CalendarDays, X, Info, CreditCard, Ban, MapPin, History } from "lucide-react";
import { MiCancelacion, MiClaseIndividual, MiSuscripcion, Disciplina, CancelacionResult, WaitlistEntry, EstadoWaitlist } from "@/types/api";
import { cancelarClase } from "@/actions/mis_clases";
import { cancelarWaitlist } from "@/actions/inscripciones";
import { crearPreferenciaWaitlistMP } from "@/actions/pagos";

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
    sala_nombre: string | null;
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
            sala_nombre: c.sala_nombre,
            cancelada: c.cancelo,
            deuda_vencida: c.deuda_vencida,
            asistencia_id: c.asistencia_id,
            monto_pagado: c.monto_pagado,
            precio_clase: c.precio_clase,
            asistio: c.asistio,
        })),
        ...suscripciones.flatMap(s =>
            s.instancias.map((inst): MisClasesItem => ({
                key: inst.asistencia_id ?? inst.instancia_id,
                tipo: "suscripcion",
                clase_nombre: s.clase_nombre,
                disciplina: s.disciplina,
                fecha: inst.fecha,
                hora_inicio: s.hora_inicio,
                hora_fin: s.hora_fin,
                profesor_nombre: s.profesor_nombre,
                sala_nombre: s.sala_nombre,
                cancelada: inst.cancelada,
                deuda_vencida: false,
                asistencia_id: inst.asistencia_id ?? undefined,
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

function canCompleteDebt(fecha: string, horaInicio: string, nowTimestamp: number): boolean {
    const oneDayMs = 24 * 60 * 60 * 1000;
    return getClassStart(fecha, horaInicio).getTime() - nowTimestamp > oneDayMs;
}

function getBlockedDebtMessage(item: MisClasesItem): string {
    if (!isUpcoming(item.fecha, item.hora_inicio)) {
        return "La clase ya paso. La deuda no se puede completar desde la app.";
    }
    return "Ya no se puede completar el pago desde la app porque faltan menos de 24 horas para la clase.";
}

function CancelDialog({
    item,
    onClose,
}: {
    item: MisClasesItem;
    onClose: () => void;
}) {
    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState<CancelacionResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [nowTimestamp] = useState(() => Date.now());

    const hoursLeft = (getClassStart(item.fecha, item.hora_inicio).getTime() - nowTimestamp) / 3_600_000;
    const hasRefund = hoursLeft >= 24;

    function handleConfirm() {
        if (!item.asistencia_id) return;
        startTransition(async () => {
            const res = await cancelarClase(item.asistencia_id!);
            if (res.error) setError(res.error);
            else setResult(res.data!);
        });
    }

    const refundHint =
        !hasRefund
            ? "Como faltan menos de 24 horas, no se realizará ningún reintegro."
            : item.tipo === "individual"
            ? "Se reintegrará el importe abonado a tu cuenta de MercadoPago."
            : "Si aplica, se generará un cupón de descuento para tu próxima renovación.";

    if (result) {
        return (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 px-4 py-6 backdrop-blur-sm">
                <div className="glass-modal w-full max-w-md rounded-2xl p-5 shadow-2xl">
                    <div className="flex items-start gap-3">
                        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border ${
                            result.refund_error
                                ? "border-cef-warning/20 bg-cef-warning/10 text-cef-warning"
                                : "border-cef-success/20 bg-cef-success/10 text-cef-success"
                        }`}>
                            <Info size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-800">Clase cancelada</h3>
                            <p className="mt-1 text-sm text-slate-600">{result.mensaje}</p>
                        </div>
                    </div>
                    <div className="mt-5 flex justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg bg-cef-primary px-4 py-2 text-sm font-semibold text-white hover:bg-cef-primary/90"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45 px-4 py-6 backdrop-blur-sm">
            <div className="glass-modal w-full max-w-md rounded-2xl p-5 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-cef-danger/20 bg-cef-danger/10 text-cef-danger">
                            <Ban size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-800">Cancelar clase</h3>
                            <p className="mt-1 text-sm text-slate-500">{item.clase_nombre}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isPending}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
                        aria-label="Cerrar"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="mt-4 space-y-3">
                    <div className={`rounded-xl border p-3 text-sm ${
                        hasRefund
                            ? "border-cef-success/20 bg-cef-success/10 text-slate-700"
                            : "border-cef-warning/20 bg-cef-warning/10 text-slate-700"
                    }`}>
                        {refundHint}
                    </div>
                    {error && (
                        <p className="text-sm text-cef-danger">{error}</p>
                    )}
                </div>

                <div className="mt-5 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isPending}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    >
                        Volver
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isPending}
                        className="rounded-lg bg-cef-danger px-4 py-2 text-sm font-semibold text-white hover:bg-cef-danger/90 disabled:opacity-60"
                    >
                        {isPending ? "Cancelando..." : "Confirmar cancelación"}
                    </button>
                </div>
            </div>
        </div>
    );
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
    const [nowTimestamp] = useState(() => Date.now());
    const canPay = Boolean(item.asistencia_id) && canCompleteDebt(item.fecha, item.hora_inicio, nowTimestamp);

    function handleGoToPayments() {
        window.location.assign("/mis-pagos");
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

// ─── Cancelaciones Modal ──────────────────────────────────────────────────────

const fmtFechaCancelacion = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
});

function formatFechaCancelacion(fechaStr: string): string {
    const [y, m, d] = fechaStr.split("-").map(Number);
    return fmtFechaCancelacion.format(new Date(y, m - 1, d));
}

function CancelacionesModal({
    cancelaciones,
    onClose,
}: {
    cancelaciones: MiCancelacion[];
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/45 px-0 pb-0 backdrop-blur-sm sm:items-center sm:px-4 sm:pb-6">
            <div className="glass-modal w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="flex items-center justify-between gap-3 p-5 border-b border-slate-200/60">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-500">
                            <History size={18} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-800">Cancelaciones</h3>
                            <p className="text-xs text-slate-400">{cancelaciones.length} clase{cancelaciones.length !== 1 ? "s" : ""} cancelada{cancelaciones.length !== 1 ? "s" : ""}</p>
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

                {/* List */}
                <div className="overflow-y-auto flex-1 p-4 space-y-2">
                    {cancelaciones.length === 0 ? (
                        <div className="py-10 text-center">
                            <p className="text-sm text-slate-400">No tenés cancelaciones registradas</p>
                        </div>
                    ) : (
                        cancelaciones.map((c) => {
                            const accent = DISCIPLINA_ACCENT[c.disciplina] ?? "bg-slate-400";
                            return (
                                <div
                                    key={c.asistencia_id}
                                    className="glass flex items-stretch overflow-hidden rounded-xl"
                                >
                                    <div className={`w-1 flex-shrink-0 ${accent} opacity-50`} />
                                    <div className="min-w-0 flex-1 px-3 py-3">
                                        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                                            <p className="text-sm font-semibold text-slate-700">{c.clase_nombre}</p>
                                            <span className={`inline-flex flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                                c.cancelado_por === "usuario"
                                                    ? "bg-cef-danger/10 text-cef-danger border border-cef-danger/20"
                                                    : "bg-cef-warning/10 text-cef-warning border border-cef-warning/20"
                                            }`}>
                                                {c.cancelado_por === "usuario" ? "Por vos" : "Por el sistema"}
                                            </span>
                                        </div>
                                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-400">
                                            <span className="inline-flex items-center gap-1">
                                                <CalendarDays size={10} className="text-slate-300" />
                                                {formatFechaCancelacion(c.fecha)}
                                            </span>
                                            <span className="inline-flex items-center gap-1">
                                                <Clock size={10} className="text-slate-300" />
                                                {formatTime(c.hora_inicio)}–{formatTime(c.hora_fin)}
                                            </span>
                                            {c.sala_nombre && (
                                                <span className="inline-flex items-center gap-1">
                                                    <MapPin size={10} className="text-slate-300" />
                                                    {c.sala_nombre}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function MiClaseRow({ item }: { item: MisClasesItem }) {
    const [debtOpen, setDebtOpen] = useState(false);
    const [cancelOpen, setCancelOpen] = useState(false);

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
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400">
                        {item.profesor_nombre && (
                            <span className="break-words">{item.profesor_nombre}</span>
                        )}
                        {item.sala_nombre && (
                            <span className="inline-flex min-w-0 items-center gap-1 break-words">
                                <MapPin size={10} className="shrink-0 text-slate-300" />
                                {item.sala_nombre}
                            </span>
                        )}
                    </div>
                </div>

                {/* Time */}
                <span className="mt-2 inline-flex flex-shrink-0 items-center gap-1 text-xs text-slate-500 sm:mt-0">
                    <Clock size={11} className="text-slate-400" />
                    {formatTime(item.hora_inicio)}–{formatTime(item.hora_fin)}
                </span>

                {/* Tipo */}
                <span className={`ml-3 mt-2 inline-flex flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide sm:ml-0 sm:mt-0 ${
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

                {/* Cancelar */}
                {upcoming && !item.cancelada && item.asistencia_id && (
                    <button
                        type="button"
                        onClick={() => setCancelOpen(true)}
                        className="mt-3 flex w-full flex-shrink-0 items-center justify-center gap-1 rounded-lg border border-cef-danger/20 bg-cef-danger/10 px-2.5 py-2 text-[11px] font-semibold text-cef-danger transition-colors hover:bg-cef-danger/20 sm:mt-0 sm:w-auto sm:py-1"
                    >
                        <Ban size={11} />
                        Cancelar
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
        {cancelOpen && (
            <CancelDialog
                item={item}
                onClose={() => setCancelOpen(false)}
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
    waitlistEntries,
    cancelaciones,
    highlightWaitlistId,
}: {
    individuales: MiClaseIndividual[];
    suscripciones: MiSuscripcion[];
    waitlistEntries: WaitlistEntry[];
    cancelaciones: MiCancelacion[];
    highlightWaitlistId?: string | null;
}) {
    const [tiempoTab, setTiempoTab] = useState<TiempoTab>("proximas");
    const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>("todas");
    const [cancelacionesOpen, setCancelacionesOpen] = useState(false);
    const highlightRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (highlightWaitlistId && highlightRef.current) {
            highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }, [highlightWaitlistId]);

    const allItems = buildItems(individuales, suscripciones);

    const proximasCount = allItems.filter(i => isUpcoming(i.fecha, i.hora_inicio)).length;
    const pasadasCount  = allItems.filter(i => !isUpcoming(i.fecha, i.hora_inicio)).length;

    const byTime = allItems.filter(i =>
        tiempoTab === "proximas" ? isUpcoming(i.fecha, i.hora_inicio) : !isUpcoming(i.fecha, i.hora_inicio)
    );
    const filtered = tipoFiltro === "todas" ? byTime : byTime.filter(i => i.tipo === tipoFiltro);

    const sorted = [...filtered].sort((a, b) => {
        const cmp = a.fecha.localeCompare(b.fecha) || a.hora_inicio.localeCompare(b.hora_inicio);
        return cmp;
    });

    async function handleCancelarEspera(waitlistId: string) {
        await cancelarWaitlist(waitlistId);
        window.location.reload();
    }

    async function handleConfirmarEspera(waitlistId: string) {
        const result = await crearPreferenciaWaitlistMP(waitlistId);
        if (result.init_point) {
            window.location.assign(result.init_point);
        }
    }

    // Group by date
    const grouped = new Map<string, MisClasesItem[]>();
    for (const item of sorted) {
        const list = grouped.get(item.fecha) ?? [];
        list.push(item);
        grouped.set(item.fecha, list);
    }

    return (
        <>
        <div className="space-y-6">
            {waitlistEntries.length > 0 && (
                <div className="glass rounded-2xl p-4">
                    <h2 className="text-sm font-bold text-slate-800">Mis Esperas ({waitlistEntries.length})</h2>
                    <div className="mt-3 space-y-2">
                        {waitlistEntries.map((entry) => {
                            const isHighlighted = entry.id === highlightWaitlistId;
                            return (
                            <div
                                key={entry.id}
                                ref={isHighlighted ? highlightRef : undefined}
                                className={`rounded-xl border p-3 ${
                                    isHighlighted
                                        ? "border-cef-primary ring-2 ring-cef-primary/30 bg-cef-primary/5"
                                        : "border-slate-200 bg-white/60"
                                }`}
                            >
                                <p className="text-sm font-semibold text-slate-800">{entry.clase_nombre}</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {entry.fecha} · Posición #{entry.posicion}
                                </p>
                                <p className={`text-xs mt-1 ${entry.estado === EstadoWaitlist.NOTIFICADO ? "text-cef-warning" : "text-slate-500"}`}>
                                    {entry.estado === EstadoWaitlist.NOTIFICADO
                                        ? "¡Se liberó un cupo! Confirmá y pagá dentro de la ventana disponible."
                                        : "En espera"}
                                </p>
                                <div className="mt-2 flex gap-2">
                                    {entry.estado === EstadoWaitlist.NOTIFICADO && (
                                        <button
                                            type="button"
                                            onClick={() => handleConfirmarEspera(entry.id)}
                                            className="rounded-lg bg-cef-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-cef-primary/90"
                                        >
                                            Confirmar Lugar
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => handleCancelarEspera(entry.id)}
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                    >
                                        Cancelar espera
                                    </button>
                                </div>
                            </div>
                            );
                        })}
                    </div>
                </div>
            )}

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
                <button
                    type="button"
                    onClick={() => setCancelacionesOpen(true)}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                    <History size={13} />
                    Ver cancelaciones
                    {cancelaciones.length > 0 && (
                        <span className="ml-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                            {cancelaciones.length}
                        </span>
                    )}
                </button>
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

        {cancelacionesOpen && (
            <CancelacionesModal
                cancelaciones={cancelaciones}
                onClose={() => setCancelacionesOpen(false)}
            />
        )}
        </>
    );
}
