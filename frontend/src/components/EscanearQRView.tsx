"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { CheckCircle2, AlertCircle, ArrowLeft, Camera, ChevronDown, Loader2 } from "lucide-react";
import { getInstanciasHoy, marcarAsistenciaQR } from "@/actions/asistencias";
import type { InstanciaHoy } from "@/types/api";

declare class BarcodeDetector {
    constructor(options?: { formats: string[] });
    detect(image: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
}

type Status = "loading" | "selectClass" | "scanning" | "processing" | "success" | "error";

const CAMERA_ERROR_MESSAGE = "No se pudo activar la cámara. Verificá los permisos del navegador o usá la pestaña de ingreso por DNI.";

export default function EscanearQRView() {
    const [status, setStatus] = useState<Status>("loading");
    const [instancias, setInstancias] = useState<InstanciaHoy[]>([]);
    const [selectedId, setSelectedId] = useState("");
    const [error, setError] = useState("");
    const [loadError, setLoadError] = useState("");
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const scannerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const hasScanned = useRef(false);

    useEffect(() => {
        getInstanciasHoy().then(({ data, error }) => {
            if (error || !data) {
                setLoadError(error ?? "Error al cargar clases");
            } else {
                setInstancias(data);
            }
            setStatus("selectClass");
        });
    }, []);

    const stopCamera = useCallback(() => {
        if (scannerRef.current) {
            clearInterval(scannerRef.current);
            scannerRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
    }, []);

    useEffect(() => () => stopCamera(), [stopCamera]);

    const startCamera = useCallback(async () => {
        hasScanned.current = false;
        setStatus("scanning");
        setError("");

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            if (!("BarcodeDetector" in window)) {
                stopCamera();
                setError(CAMERA_ERROR_MESSAGE);
                setStatus("error");
                return;
            }

            const detector = new BarcodeDetector({ formats: ["qr_code"] });

            scannerRef.current = setInterval(async () => {
                if (!videoRef.current || hasScanned.current) return;
                try {
                    const codes = await detector.detect(videoRef.current);
                    if (codes.length > 0) {
                        hasScanned.current = true;
                        const dni = codes[0].rawValue;
                        stopCamera();
                        setStatus("processing");
                        const { error } = await marcarAsistenciaQR(selectedId, dni);
                        if (error) {
                            setError(error);
                            setStatus("error");
                        } else {
                            setStatus("success");
                        }
                    }
                } catch {
                    // BarcodeDetector may fail on individual frames — ignore
                }
            }, 200);
        } catch {
            setError(CAMERA_ERROR_MESSAGE);
            setStatus("error");
        }
    }, [selectedId, stopCamera]);

    const reset = useCallback(() => {
        stopCamera();
        hasScanned.current = false;
        setStatus("selectClass");
        setError("");
    }, [stopCamera]);

    if (status === "loading") {
        return (
            <div className="max-w-md glass rounded-2xl p-8 flex items-center justify-center gap-3">
                <Loader2 className="animate-spin text-cef-primary" size={20} />
                <span className="text-sm text-slate-500">Cargando clases de hoy…</span>
            </div>
        );
    }

    if (status === "selectClass") {
        return (
            <div className="max-w-md glass rounded-2xl p-5 space-y-4">
                <div>
                    <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                        Clase a registrar
                    </label>
                    {loadError ? (
                        <p className="text-sm text-red-500">{loadError}</p>
                    ) : instancias.length === 0 ? (
                        <p className="text-sm text-slate-500">No hay clases programadas para hoy.</p>
                    ) : (
                        <div className="relative">
                            <select
                                value={selectedId}
                                onChange={(e) => setSelectedId(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 focus:border-cef-primary/60 focus:ring-2 focus:ring-cef-primary/15 outline-none transition-all text-sm appearance-none pr-8"
                            >
                                <option value="">Seleccionar clase...</option>
                                {instancias.map((i) => (
                                    <option key={i.instancia_id} value={i.instancia_id}>
                                        {i.clase_nombre} — {i.hora_inicio}hs ({i.sala_nombre})
                                    </option>
                                ))}
                            </select>
                            <ChevronDown
                                size={14}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                            />
                        </div>
                    )}
                </div>
                <button
                    onClick={startCamera}
                    disabled={!selectedId}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cef-primary text-white rounded-xl text-sm font-medium hover:bg-cef-primary/80 disabled:opacity-50 transition-colors"
                >
                    <Camera size={15} />
                    Activar cámara
                </button>
            </div>
        );
    }

    if (status === "scanning") {
        return (
            <div className="max-w-md glass rounded-2xl overflow-hidden">
                <div className="px-5 pt-4 pb-2">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                        Escaneando QR del cliente
                    </p>
                </div>
                <div className="relative bg-black aspect-square max-h-72">
                    <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-44 h-44 border-2 border-white/70 rounded-xl" />
                    </div>
                </div>
                <div className="px-5 py-4 flex items-center justify-between">
                    <p className="text-sm text-slate-500">Apuntá la cámara al QR del cliente</p>
                    <button
                        onClick={reset}
                        className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        );
    }

    if (status === "processing") {
        return (
            <div className="max-w-md glass rounded-2xl p-8 flex items-center justify-center gap-3">
                <Loader2 className="animate-spin text-cef-primary" size={20} />
                <span className="text-sm text-slate-500">Registrando asistencia…</span>
            </div>
        );
    }

    if (status === "success") {
        return (
            <div className="max-w-md glass rounded-2xl p-5 space-y-4">
                <div className="flex items-start gap-3">
                    <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={20} />
                    <p className="text-sm font-medium text-slate-700">
                        Se registró la asistencia correctamente
                    </p>
                </div>
                <button
                    onClick={reset}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-500 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                    <ArrowLeft size={13} />
                    Escanear otro
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-md glass rounded-2xl p-5 space-y-4">
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
