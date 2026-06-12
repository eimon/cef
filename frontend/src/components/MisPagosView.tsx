"use client";

import { CheckCircle2, CreditCard, ReceiptText } from "lucide-react";
import { MiPago } from "@/types/api";

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

function getPaymentConcept(payment: MiPago) {
    if (payment.clase_nombre) return payment.clase_nombre;
    if (payment.descripcion) return payment.descripcion;
    return payment.tipo === "suscripcion" ? "Suscripcion" : "Pago";
}

function getPaymentSubtitle(payment: MiPago) {
    const parts = [
        payment.tipo === "suscripcion" ? "Suscripcion" : payment.tipo === "individual" ? "Clase individual" : "Movimiento",
        payment.disciplina,
        payment.mp_payment_id ? `MP ${payment.mp_payment_id}` : null,
    ].filter(Boolean);

    return parts.join(" - ");
}

function PaymentStatusBadge() {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-cef-success/20 bg-cef-success/10 px-2.5 py-1 text-xs font-semibold text-cef-success">
            <CheckCircle2 size={13} />
            Exitoso
        </span>
    );
}

function PaymentRow({ payment }: { payment: MiPago }) {
    return (
        <div className="glass rounded-xl px-4 py-3 transition-all hover:border-slate-300 hover:shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
                        <CreditCard size={18} />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{getPaymentConcept(payment)}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-400">{getPaymentSubtitle(payment)}</p>
                        {payment.descripcion && payment.clase_nombre && (
                            <p className="mt-1 text-xs text-slate-500">{payment.descripcion}</p>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                    <span className="text-xs font-medium text-slate-400">{formatPaymentDate(payment.fecha_pago)}</span>
                    <PaymentStatusBadge />
                    <span className="min-w-24 text-left text-sm font-bold text-slate-800 sm:text-right">
                        {formatPaymentAmount(payment.monto)}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default function MisPagosView({ pagos }: { pagos: MiPago[] }) {
    return (
        <div>
            {pagos.length === 0 ? (
                <div className="glass rounded-2xl px-6 py-12 text-center">
                    <ReceiptText className="mx-auto text-slate-300" size={34} />
                    <p className="mt-3 text-sm font-semibold text-slate-600">Aún no se han realizado pagos</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {pagos.map((payment) => (
                        <PaymentRow key={payment.id} payment={payment} />
                    ))}
                </div>
            )}
        </div>
    );
}
