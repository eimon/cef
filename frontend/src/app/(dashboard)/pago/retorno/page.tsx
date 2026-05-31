import Link from "next/link";
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { confirmarPagoMP, confirmarDeudaMP } from "@/actions/pagos";

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
    const esDeuda = params.tipo === "deuda";

    if (status === "approved" && paymentId) {
        const result = esDeuda
            ? await confirmarDeudaMP(paymentId)
            : await confirmarPagoMP(paymentId);

        if (result.error) {
            return (
                <RetornoLayout
                    icon={<AlertCircle size={40} className="text-cef-warning" />}
                    title="Error al confirmar el pago"
                    message={result.error}
                    linkHref="/clases"
                    linkLabel="Volver a clases"
                />
            );
        }

        return (
            <RetornoLayout
                icon={<CheckCircle size={40} className="text-cef-success" />}
                title="¡Pago exitoso!"
                message="Tu inscripción fue confirmada. Ya podés ver tu clase en Mis Clases."
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

    return (
        <RetornoLayout
            icon={<XCircle size={40} className="text-cef-danger" />}
            title="Pago no completado"
            message="No se pudo procesar el pago. Podés intentar nuevamente desde la grilla de clases."
            linkHref="/clases"
            linkLabel="Volver a clases"
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
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="glass rounded-2xl p-10 max-w-sm w-full text-center space-y-4">
                <div className="flex justify-center">{icon}</div>
                <h1 className="text-xl font-bold text-slate-800">{title}</h1>
                <p className="text-sm text-slate-500 leading-relaxed">{message}</p>
                <Link
                    href={linkHref}
                    className="inline-block mt-2 px-6 py-2.5 rounded-lg bg-cef-primary text-white text-sm font-semibold hover:bg-cef-primary/90 transition-colors"
                >
                    {linkLabel}
                </Link>
            </div>
        </div>
    );
}
