"use client";

import { useState } from "react";
import { AlertCircle, Clock, CreditCard, Loader2, ReceiptText, RefreshCw } from "lucide-react";
import { crearPreferenciaDeudaMP, crearPreferenciaRenovacionSuscripcionMP } from "@/actions/pagos";
import { DeudaPendiente, MiPago, RenovacionSuscripcionPendiente } from "@/types/api";

const paymentFormatter = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
});

function formatPaymentDate(value: string) {
    return dateFormatter.format(new Date(value));
}

function formatPaymentAmount(value: number) {
    return paymentFormatter.format(value);
}

function getClassCountLabel(count: number) {
    return count === 1 ? "1 clase" : `${count} clases`;
}

function parseLocalDate(value: string) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function getRenewalTimeLabel(limitDate: string) {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const limit = parseLocalDate(limitDate);
    const days = Math.max(0, Math.ceil((limit.getTime() - todayStart.getTime()) / 86_400_000));

    return days === 1 ? "Vence en 1 día" : `Vence en ${days} días`;
}

function getDebtTimeLabel(classDate: string) {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const classStart = new Date(classDate);
    const limit = new Date(classStart.getFullYear(), classStart.getMonth(), classStart.getDate() - 1);
    const days = Math.max(0, Math.ceil((limit.getTime() - todayStart.getTime()) / 86_400_000));

    return days === 1 ? "Vence en 1 día" : `Vence en ${days} días`;
}

function formatDiscipline(value: string | null) {
    if (!value) return "Disciplina";
    const normalized = value.toLocaleLowerCase("es-AR");
    return normalized.charAt(0).toLocaleUpperCase("es-AR") + normalized.slice(1);
}

function getPaymentTypeLabel(payment: MiPago) {
    return payment.tipo === "suscripcion" ? "Suscripción" : "Individual";
}

function PendingRenewalRow({ renewal }: { renewal: RenovacionSuscripcionPendiente }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleRenew() {
        setLoading(true);
        setError("");
        const result = await crearPreferenciaRenovacionSuscripcionMP(renewal.suscripcion_id);
        if (result.error) {
            setLoading(false);
            setError(result.error);
            return;
        }
        if (result.init_point) window.location.href = result.init_point;
    }

    return (
        <div className="glass rounded-xl px-4 py-3 transition-all hover:border-slate-300 hover:shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-cef-warning/20 bg-cef-warning/10 text-cef-warning">
                        <RefreshCw size={18} />
                    </div>
                    <div className="min-w-0">
                        <p className="break-words text-sm font-semibold leading-tight text-slate-800">
                            {formatDiscipline(renewal.disciplina)}
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-slate-400">
                            Renovación de suscripción
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                                {getClassCountLabel(renewal.cantidad_clases)}
                            </span>
                        </div>
                        {error && (
                            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-cef-danger">
                                <AlertCircle size={13} />
                                {error}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-2 sm:items-end">
                    <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-cef-warning/20 bg-cef-warning/10 px-2.5 py-1 text-xs font-semibold text-cef-warning sm:self-auto">
                        <Clock size={13} />
                        {getRenewalTimeLabel(renewal.renovacion_disponible_hasta)}
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                        {formatPaymentAmount(renewal.precio_total)}
                    </span>
                    <button
                        type="button"
                        onClick={handleRenew}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-cef-primary px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-cef-primary/90 disabled:opacity-60"
                    >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                        Renovar
                    </button>
                </div>
            </div>
        </div>
    );
}

function PendingDebtRow({ debt }: { debt: DeudaPendiente }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handlePayDebt() {
        setLoading(true);
        setError("");
        const result = await crearPreferenciaDeudaMP(debt.asistencia_id);
        if (result.error) {
            setLoading(false);
            setError(result.error);
            return;
        }
        if (result.init_point) window.location.href = result.init_point;
    }

    return (
        <div className="glass rounded-xl px-4 py-3 transition-all hover:border-slate-300 hover:shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-cef-warning/20 bg-cef-warning/10 text-cef-warning">
                        <CreditCard size={18} />
                    </div>
                    <div className="min-w-0">
                        <p className="break-words text-sm font-semibold leading-tight text-slate-800">
                            {formatDiscipline(debt.disciplina)}
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-slate-400">
                            Pago parcial pendiente
                        </p>
                        {error && (
                            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-cef-danger">
                                <AlertCircle size={13} />
                                {error}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-2 sm:items-end">
                    <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-cef-warning/20 bg-cef-warning/10 px-2.5 py-1 text-xs font-semibold text-cef-warning sm:self-auto">
                        <Clock size={13} />
                        {getDebtTimeLabel(debt.fecha)}
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                        {formatPaymentAmount(debt.monto_restante)}
                    </span>
                    <button
                        type="button"
                        onClick={handlePayDebt}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-cef-primary px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-cef-primary/90 disabled:opacity-60"
                    >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                        Pagar deuda
                    </button>
                </div>
            </div>
        </div>
    );
}

function PaymentRow({ payment }: { payment: MiPago }) {
    return (
        <div className="glass rounded-xl px-4 py-3 transition-all hover:border-slate-300 hover:shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-h-9 min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
                        <CreditCard size={18} />
                    </div>
                    <div className="min-w-0">
                        <p className="break-words text-sm font-semibold leading-tight text-slate-800">
                            {formatDiscipline(payment.disciplina)}
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-slate-400">
                            {getPaymentTypeLabel(payment)}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                    <span className="text-xs font-medium text-slate-400">{formatPaymentDate(payment.fecha_pago)}</span>
                    <span className="min-w-24 text-left text-sm font-bold text-slate-800 sm:text-right">
                        {formatPaymentAmount(payment.monto)}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default function MisPagosView({
    pagos,
    renovacionesPendientes,
    deudasPendientes,
}: {
    pagos: MiPago[];
    renovacionesPendientes: RenovacionSuscripcionPendiente[];
    deudasPendientes: DeudaPendiente[];
}) {
    const hasPending = renovacionesPendientes.length > 0 || deudasPendientes.length > 0;
    const hasPayments = pagos.length > 0;
    const isCompletelyEmpty = !hasPending && !hasPayments;

    return (
        <div className="space-y-6">
            {hasPending && (
                <section className="space-y-2">
                    <div>
                        <h2 className="text-sm font-bold text-slate-800">Pagos pendientes</h2>
                        <p className="mt-0.5 text-xs text-slate-400">
                            Pagos disponibles por tiempo limitado.
                        </p>
                    </div>
                    <div className="space-y-2">
                        {deudasPendientes.map((debt) => (
                            <PendingDebtRow key={debt.asistencia_id} debt={debt} />
                        ))}
                        {renovacionesPendientes.map((renewal) => (
                            <PendingRenewalRow key={renewal.suscripcion_id} renewal={renewal} />
                        ))}
                    </div>
                </section>
            )}

            {!hasPayments ? (isCompletelyEmpty ? (
                <div className="glass rounded-2xl px-6 py-12 text-center">
                    <ReceiptText className="mx-auto text-slate-300" size={34} />
                    <p className="mt-3 text-sm font-semibold text-slate-600">Aún no se han realizado pagos</p>
                </div>
            ) : null) : (
                <section className="space-y-2">
                    <h2 className="text-sm font-bold text-slate-800">Pagos exitosos</h2>
                    <div className="space-y-2">
                        {pagos.map((payment) => (
                            <PaymentRow key={payment.id} payment={payment} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
