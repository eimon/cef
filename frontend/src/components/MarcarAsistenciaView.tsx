"use client";

import { useState, useRef } from "react";
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft, UserCheck } from "lucide-react";
import { escanearQR, marcarPresente } from "@/actions/asistencias";
import type { EscaneoQRResult } from "@/types/api";

type Status = "idle" | "loading" | "confirming" | "marking" | "success" | "error";

const inputCls =
    "flex-1 px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 focus:border-cef-primary/60 focus:ring-2 focus:ring-cef-primary/15 outline-none transition-all text-sm disabled:opacity-50";

export default function MarcarAsistenciaView() {
    const [dni, setDni] = useState("");
    const [status, setStatus] = useState<Status>("idle");
    const [result, setResult] = useState<EscaneoQRResult | null>(null);
    const [error, setError] = useState("");
    const [successName, setSuccessName] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const buscar = async () => {
        const trimmed = dni.trim();
        if (!trimmed) return;
        setStatus("loading");
        setError("");

        const { data, error } = await escanearQR(trimmed);
        if (error || !data) {
            setError(error ?? "Error al buscar el cliente");
            setStatus("error");
        } else {
            setResult(data);
            setStatus("confirming");
        }
    };

    const confirmar = async () => {
        if (!result) return;
        setStatus("marking");

        for (const a of result.asistencias) {
            const { error } = await marcarPresente(a.asistencia_id);
            if (error) {
                setError(error);
                setStatus("error");
                return;
            }
        }

        setSuccessName(result.usuario_nombre);
        setStatus("success");
    };

    const reset = () => {
        setStatus("idle");
        setResult(null);
        setDni("");
        setError("");
        setSuccessName("");
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    return (
        <div className="max-w-md space-y-4">
            {/* Ingreso de DNI */}
            {(status === "idle" || status === "loading") && (
                <div className="glass rounded-2xl p-5">
                    <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                        DNI del cliente
                    </label>
                    <div className="flex gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={dni}
                            onChange={(e) => setDni(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && buscar()}
                            placeholder="Ej: 43245445"
                            disabled={status === "loading"}
                            className={inputCls}
                            autoFocus
                        />
                        <button
                            onClick={buscar}
                            disabled={!dni.trim() || status === "loading"}
                            className="flex items-center gap-2 px-4 py-2 bg-cef-primary text-white rounded-lg text-sm font-medium hover:bg-cef-primary/80 disabled:opacity-50 transition-colors whitespace-nowrap"
                        >
                            {status === "loading" ? (
                                <Loader2 size={15} className="animate-spin" />
                            ) : (
                                <UserCheck size={15} />
                            )}
                            Confirmar asistencia
                        </button>
                    </div>
                </div>
            )}

            {/* Modal de confirmación */}
            {status === "confirming" && result && (
                <div className="glass rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100">
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-2">
                            Confirmar asistencia
                        </p>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            ¿Desea registrar la asistencia para{" "}
                            <span className="font-semibold text-slate-800">{result.usuario_nombre}</span>
                            {result.asistencias.length === 1 ? (
                                <>
                                    {" "}a la clase de{" "}
                                    <span className="font-semibold text-slate-800">
                                        {result.asistencias[0].clase_nombre} {result.asistencias[0].hora_inicio}hs
                                    </span>
                                </>
                            ) : null}
                            ?
                        </p>
                        {result.asistencias.length > 1 && (
                            <ul className="mt-2 space-y-0.5">
                                {result.asistencias.map((a) => (
                                    <li key={a.asistencia_id} className="text-sm text-slate-600">
                                        • {a.clase_nombre} {a.hora_inicio}hs
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="px-5 py-4 flex gap-2 justify-end">
                        <button
                            onClick={reset}
                            className="px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={confirmar}
                            className="flex items-center gap-2 px-4 py-2 bg-cef-primary text-white rounded-lg text-sm font-medium hover:bg-cef-primary/80 transition-colors"
                        >
                            <UserCheck size={15} />
                            Confirmar
                        </button>
                    </div>
                </div>
            )}

            {/* Registrando */}
            {status === "marking" && (
                <div className="glass rounded-2xl p-8 flex items-center justify-center gap-3">
                    <Loader2 className="animate-spin text-cef-primary" size={20} />
                    <span className="text-sm text-slate-500">Registrando asistencia…</span>
                </div>
            )}

            {/* Éxito */}
            {status === "success" && (
                <div className="glass rounded-2xl p-5 space-y-4">
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={20} />
                        <p className="text-sm font-medium text-slate-700">
                            Asistencia registrada correctamente para{" "}
                            <span className="font-semibold">{successName}</span>
                        </p>
                    </div>
                    <button
                        onClick={reset}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-500 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
                    >
                        <ArrowLeft size={13} />
                        Registrar otra asistencia
                    </button>
                </div>
            )}

            {/* Error */}
            {status === "error" && (
                <div className="glass rounded-2xl p-5 space-y-4">
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
            )}
        </div>
    );
}
