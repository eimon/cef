"use client";

import { useState } from "react";
import { Play, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { ejecutarCronRenovaciones, ejecutarCronNotificaciones } from "@/actions/simulaciones";

type ActionResult = {
    status: "idle" | "loading" | "success" | "error";
    data?: Record<string, unknown>;
    error?: string;
};

function CronCard({
    title,
    description,
    onRun,
    result,
}: {
    title: string;
    description: string;
    onRun: () => void;
    result: ActionResult;
}) {
    return (
        <div className="glass rounded-2xl p-6 flex flex-col gap-4">
            <div>
                <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
                <p className="text-xs text-slate-400 mt-1">{description}</p>
            </div>

            <button
                type="button"
                onClick={onRun}
                disabled={result.status === "loading"}
                className="self-start flex items-center gap-2 px-4 py-2 rounded-lg bg-cef-primary text-white text-sm font-medium hover:bg-cef-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
                {result.status === "loading" ? (
                    <>
                        <RefreshCw size={14} className="animate-spin" />
                        Ejecutando…
                    </>
                ) : (
                    <>
                        <Play size={14} />
                        Ejecutar
                    </>
                )}
            </button>

            {result.status === "success" && result.data && (
                <div className="rounded-xl bg-cef-success/10 border border-cef-success/20 px-4 py-3 flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-cef-success mt-0.5 flex-shrink-0" />
                    <pre className="text-xs text-cef-success font-mono whitespace-pre-wrap">
                        {JSON.stringify(result.data, null, 2)}
                    </pre>
                </div>
            )}

            {result.status === "error" && (
                <div className="rounded-xl bg-cef-danger/10 border border-cef-danger/20 px-4 py-3 flex items-start gap-2">
                    <AlertCircle size={15} className="text-cef-danger mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-cef-danger">{result.error}</p>
                </div>
            )}
        </div>
    );
}

export default function SimulacionesView() {
    const [renovacionesResult, setRenovacionesResult] = useState<ActionResult>({ status: "idle" });
    const [notificacionesResult, setNotificacionesResult] = useState<ActionResult>({ status: "idle" });

    async function runRenovaciones() {
        setRenovacionesResult({ status: "loading" });
        const res = await ejecutarCronRenovaciones();
        if (res.error) {
            setRenovacionesResult({ status: "error", error: res.error });
        } else {
            setRenovacionesResult({ status: "success", data: res.data });
        }
    }

    async function runNotificaciones() {
        setNotificacionesResult({ status: "loading" });
        const res = await ejecutarCronNotificaciones();
        if (res.error) {
            setNotificacionesResult({ status: "error", error: res.error });
        } else {
            setNotificacionesResult({ status: "success", data: res.data });
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Simulaciones</h1>
                <p className="text-sm text-slate-400 mt-1">Acciones de cron para usar en la demo.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <CronCard
                    title="Renovar suscripciones vencidas"
                    description="Procesa todas las suscripciones activas, avanza estados y crea los ciclos del mes siguiente para las vencidas."
                    onRun={runRenovaciones}
                    result={renovacionesResult}
                />
                <CronCard
                    title="Notificar vencimientos próximos"
                    description="Envía un email a los clientes cuya suscripción vence en la cantidad de días configurada como aviso."
                    onRun={runNotificaciones}
                    result={notificacionesResult}
                />
            </div>
        </div>
    );
}
