"use client";

import { useState } from "react";
import { Megaphone, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { enviarAvisoMasivo } from "@/actions/users";

type Status = "idle" | "sending" | "success" | "error";

export default function AvisoMasivoView() {
    const [mensaje, setMensaje] = useState("");
    const [status, setStatus] = useState<Status>("idle");
    const [result, setResult] = useState<{ enviados: number; total: number } | null>(null);
    const [error, setError] = useState("");

    const MIN = 10;
    const valido = mensaje.trim().length >= MIN;

    const handleEnviar = async () => {
        if (!valido) return;
        setStatus("sending");
        const { data, error } = await enviarAvisoMasivo(mensaje.trim());
        if (error || !data) {
            setError(error ?? "Error desconocido");
            setStatus("error");
        } else {
            setResult(data);
            setStatus("success");
        }
    };

    const reset = () => {
        setStatus("idle");
        setMensaje("");
        setResult(null);
        setError("");
    };

    if (status === "success" && result) {
        return (
            <div className="max-w-lg glass rounded-2xl p-6 space-y-4">
                <div className="flex items-start gap-3">
                    <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={20} />
                    <p className="text-sm font-medium text-slate-700">Aviso enviado con éxito</p>
                </div>
                <button
                    onClick={reset}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-500 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                    <ArrowLeft size={13} />
                    Aviso masivo
                </button>
            </div>
        );
    }

    if (status === "error") {
        return (
            <div className="max-w-lg glass rounded-2xl p-6 space-y-4">
                <div className="flex items-start gap-3">
                    <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
                    <p className="text-sm text-red-600">{error}</p>
                </div>
                <button
                    onClick={reset}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-500 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                    <ArrowLeft size={13} />
                    Intentar de nuevo
                </button>
            </div>
        );
    }

    if (status === "sending") {
        return (
            <div className="max-w-lg glass rounded-2xl p-8 flex items-center justify-center gap-3">
                <Loader2 className="animate-spin text-cef-primary" size={20} />
                <span className="text-sm text-slate-500">Enviando correos…</span>
            </div>
        );
    }

    return (
        <div className="max-w-lg glass rounded-2xl p-6 space-y-4">
            <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Mensaje del aviso
                </label>
                <textarea
                    value={mensaje}
                    onChange={(e) => setMensaje(e.target.value)}
                    placeholder="Redactá el aviso que recibirán todos los clientes…"
                    rows={6}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 focus:border-cef-primary/60 focus:ring-2 focus:ring-cef-primary/15 outline-none transition-all text-sm resize-none"
                />
                <p className={`text-xs ${mensaje.trim().length < MIN && mensaje.length > 0 ? "text-red-400" : "text-slate-400"}`}>
                    {mensaje.trim().length} / mínimo {MIN} caracteres
                </p>
            </div>
            <button
                onClick={handleEnviar}
                disabled={!valido}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cef-primary text-white rounded-xl text-sm font-medium hover:bg-cef-primary/80 disabled:opacity-50 transition-colors"
            >
                <Megaphone size={15} />
                Enviar aviso masivo
            </button>
        </div>
    );
}
