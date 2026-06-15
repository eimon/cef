import Link from "next/link";
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import {
    confirmarPagoMP,
    confirmarDeudaMP,
    confirmarSuscripcionMP,
    confirmarRenovacionSuscripcionMP,
} from "@/actions/pagos";

export default async function PagoRetornoPage({
    searchParams,
}: {
    searchParams: Promise<{
        status?: string;
        payment_id?: string;
        collection_id?: string;
        collection_status?: string;
        tipo?: string;
    }>;
}) {
    const params = await searchParams;
    const status = params.status || params.collection_status;
    const rawPaymentId = params.payment_id || params.collection_id;
    const paymentId = rawPaymentId && rawPaymentId !== "null" ? rawPaymentId : undefined;
    const tipo = params.tipo;

    async function confirmPayment(id: string) {
        if (tipo === "deuda") return confirmarDeudaMP(id);
        if (tipo === "suscripcion") return confirmarSuscripcionMP(id);
        if (tipo === "renovacion-suscripcion") return confirmarRenovacionSuscripcionMP(id);
        return confirmarPagoMP(id);
    }

    if ((status === "approved" || status === "pending") && paymentId) {
        const result = await confirmPayment(paymentId);

        if (result.error) {
            return (
                <RetornoLayout
                    icon={<AlertCircle size={40} className="text-cef-warning" />}
                    title="Ocurrió un error en el pago"
                    message={result.error}
                    linkHref={tipo === "deuda" ? "/mis-pagos" : "/clases"}
                    linkLabel={tipo === "deuda" ? "Volver a Mis Pagos" : "Volver a clases"}
                />
            );
        }

        if (result.status === "pending") {
            return (
                <RetornoLayout
                    icon={<Clock size={40} className="text-cef-warning" />}
                    title="Pago pendiente"
                    message="Tu pago está siendo procesado. Te notificaremos cuando se confirme."
                    linkHref="/clases"
                    linkLabel="Volver a clases"
                />
            );
        }

        const esSuscripcion = tipo === "suscripcion" || tipo === "renovacion-suscripcion";
        const esRenovacion = tipo === "renovacion-suscripcion";
        return (
            <RetornoLayout
                icon={<CheckCircle size={40} className="text-cef-success" />}
                title={esSuscripcion ? "¡Suscripción confirmada!" : "¡Pago exitoso!"}
                message={
                    esRenovacion
                        ? "Tu suscripción fue renovada. Ya podés verla en Mis Clases."
                        : esSuscripcion
                        ? "Tu suscripción fue activada. Ya podés verla en Mis Clases."
                        : tipo === "deuda"
                        ? "El pago de la deuda fue exitoso"
                        : "Tu inscripción fue confirmada. Ya podés ver tu clase en Mis Clases."
                }
                linkHref="/mis-clases"
                linkLabel="Ver mis clases"
            />
        );
    }

    if (status === "pending") {
        return (
            <RetornoLayout
                icon={<Clock size={40} className="text-cef-warning" />}
                title="Pago pendiente"
                message="Tu pago está siendo procesado. Te notificaremos cuando se confirme."
                linkHref="/clases"
                linkLabel="Volver a clases"
            />
        );
    }

    if (paymentId) {
        const result = await confirmPayment(paymentId);

        if (result.error) {
            return (
                <RetornoLayout
                    icon={<AlertCircle size={40} className="text-cef-warning" />}
                    title="Ocurrió un error en el pago"
                    message={result.error}
                    linkHref={tipo === "deuda" ? "/mis-pagos" : "/clases"}
                    linkLabel={tipo === "deuda" ? "Volver a Mis Pagos" : "Volver a clases"}
                />
            );
        }
    }

    return (
        <RetornoLayout
            icon={<XCircle size={40} className="text-cef-danger" />}
            title="Ocurrió un error en el pago"
            message={tipo === "deuda"
                ? "No se pudo procesar el pago. Podés intentarlo nuevamente desde Mis Pagos."
                : "No se pudo procesar el pago. Podés intentar nuevamente desde la grilla de clases."}
            linkHref={tipo === "deuda" ? "/mis-pagos" : "/clases"}
            linkLabel={tipo === "deuda" ? "Volver a Mis Pagos" : "Volver a clases"}
        />
    );
}

function RetornoLayout({
    icon,
    title,
    message,
    linkHref,
    linkLabel,
}: {
    icon: React.ReactNode;
    title: string;
    message: string;
    linkHref: string;
    linkLabel: string;
}) {
    return (
        <div className="flex min-h-[60vh] items-center justify-center">
            <div className="glass w-full max-w-sm space-y-4 rounded-2xl p-10 text-center">
                <div className="flex justify-center">{icon}</div>
                <h1 className="text-xl font-bold text-slate-800">{title}</h1>
                <p className="text-sm leading-relaxed text-slate-500">{message}</p>
                <Link
                    href={linkHref}
                    className="mt-2 inline-block rounded-lg bg-cef-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cef-primary/90"
                >
                    {linkLabel}
                </Link>
            </div>
        </div>
    );
}
