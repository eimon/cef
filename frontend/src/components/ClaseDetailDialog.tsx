"use client";

import { useState } from "react";
import { X, Clock, MapPin, User, Users, DollarSign, CalendarDays, ChevronRight, AlertCircle } from "lucide-react";
import { ClaseSemana } from "@/types/api";
import { checkElegibilidadIndividual, inscribirseIndividual } from "@/actions/inscripciones";
import MockPaymentModal from "@/components/MockPaymentModal";

const DIA_LABELS: Record<string, string> = {
    lunes: "Lunes",
    martes: "Martes",
    miercoles: "Miércoles",
    jueves: "Jueves",
    viernes: "Viernes",
    sabado: "Sábado",
    domingo: "Domingo",
};

function formatTime(time: string) {
    return time.slice(0, 5);
}

function formatPrice(price: number) {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        minimumFractionDigits: 0,
    }).format(price);
}

function formatFechaLarga(fechaStr: string): string {
    const [y, m, d] = fechaStr.split("-").map(Number);
    return new Intl.DateTimeFormat("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(new Date(y, m - 1, d));
}

function isFutureDate(fechaStr: string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [y, m, d] = fechaStr.split("-").map(Number);
    return new Date(y, m - 1, d) > today;
}

type Step = "detail" | "amount" | "payment";

export default function ClaseDetailDialog({
    clase,
    isOpen,
    onClose,
}: {
    clase: ClaseSemana | null;
    isOpen: boolean;
    onClose: () => void;
}) {
    const [step, setStep] = useState<Step>("detail");
    const [paymentType, setPaymentType] = useState<"full" | "partial">("full");
    const [partialAmount, setPartialAmount] = useState("");
    const [showPayment, setShowPayment] = useState(false);
    const [amountError, setAmountError] = useState("");
    const [checkLoading, setCheckLoading] = useState(false);
    const [checkError, setCheckError] = useState("");

    if (!isOpen || !clase) return null;

    const canEnroll =
        !!clase.instancia &&
        !clase.instancia.cancelada &&
        isFutureDate(clase.fecha_en_semana);

    const precio = clase.precio_individual;
    const montoMinimo = precio / 2;

    const selectedMonto =
        paymentType === "full"
            ? precio
            : parseFloat(partialAmount) || 0;

    function handleClose() {
        setStep("detail");
        setPaymentType("full");
        setPartialAmount("");
        setAmountError("");
        setCheckError("");
        setShowPayment(false);
        onClose();
    }

    async function handleInscribirse() {
        if (!clase?.instancia) return;
        setCheckLoading(true);
        setCheckError("");
        const result = await checkElegibilidadIndividual(clase.instancia.id);
        setCheckLoading(false);
        if (result.error) {
            setCheckError(result.error);
            return;
        }
        setStep("amount");
    }

    function handleContinuarPago() {
        if (paymentType === "partial") {
            const monto = parseFloat(partialAmount);
            if (isNaN(monto) || monto <= montoMinimo || monto > precio) {
                setAmountError(
                    `El monto parcial debe ser mayor al 50% (${formatPrice(montoMinimo)}) y menor o igual al precio completo`
                );
                return;
            }
        }
        setAmountError("");
        setShowPayment(true);
    }

    async function handlePay() {
        if (!clase?.instancia) return { error: "Clase sin instancia" };
        return await inscribirseIndividual(clase.instancia.id, selectedMonto);
    }

    function handlePaymentClose() {
        setShowPayment(false);
        handleClose();
    }

    return (
        <>
            {/* Backdrop */}
            <button
                type="button"
                aria-label="Cerrar detalle"
                className="fixed inset-0 z-50 w-full bg-black/40 backdrop-blur-sm transition-opacity cursor-default"
                onClick={handleClose}
            />

            {/* Modal Container */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div className="glass-modal rounded-2xl w-full max-w-lg pointer-events-auto animate-in fade-in zoom-in-95 duration-200">

                    {/* Header */}
                    <div className="relative px-6 pt-6 pb-4 border-b border-slate-200">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 tracking-tight">{clase.nombre}</h2>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-cef-primary/10 text-cef-primary border border-cef-primary/20 capitalize">
                                        <CalendarDays size={13} />
                                        {DIA_LABELS[clase.dia_semana] ?? clase.dia_semana}
                                    </span>
                                    <span className="text-xs text-slate-400 capitalize">
                                        {formatFechaLarga(clase.fecha_en_semana)}
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex-shrink-0 p-1.5 text-slate-400 rounded-lg hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Body — Step: detail */}
                    {step === "detail" && (
                        <div className="px-6 py-5 space-y-5">
                            {clase.descripcion && (
                                <p className="text-sm text-slate-500 leading-relaxed">{clase.descripcion}</p>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="glass rounded-xl p-3.5 space-y-1.5">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Clock size={14} />
                                        <span className="text-xs font-medium uppercase tracking-wider text-[10px]">Horario</span>
                                    </div>
                                    <p className="text-sm font-semibold text-slate-800">
                                        {formatTime(clase.hora_inicio)} – {formatTime(clase.hora_fin)}
                                    </p>
                                </div>

                                <div className="glass rounded-xl p-3.5 space-y-1.5">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <User size={14} />
                                        <span className="text-xs font-medium uppercase tracking-wider text-[10px]">Profesor</span>
                                    </div>
                                    <p className="text-sm font-semibold text-slate-800 truncate">
                                        {clase.profesor_nombre ?? "Sin asignar"}
                                    </p>
                                </div>

                                <div className="glass rounded-xl p-3.5 space-y-1.5">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <MapPin size={14} />
                                        <span className="text-xs font-medium uppercase tracking-wider text-[10px]">Sala</span>
                                    </div>
                                    <p className="text-sm font-semibold text-slate-800 truncate">
                                        {clase.sala_nombre ?? "Sin asignar"}
                                    </p>
                                </div>

                                <div className="glass rounded-xl p-3.5 space-y-1.5">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Users size={14} />
                                        <span className="text-xs font-medium uppercase tracking-wider text-[10px]">Cupo</span>
                                    </div>
                                    <p className="text-sm font-semibold text-slate-800">
                                        {clase.capacidad_maxima} personas
                                    </p>
                                </div>
                            </div>

                            {clase.instancia?.cancelada && (
                                <div className="rounded-xl px-4 py-3 bg-cef-danger/10 border border-cef-danger/20">
                                    <p className="text-sm font-medium text-cef-danger">
                                        Esta clase fue cancelada para esta fecha.
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                <div className="glass rounded-xl p-4 flex flex-col justify-between space-y-4 group">
                                    <div>
                                        <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                                            <DollarSign size={14} />
                                            <span className="text-[10px] font-medium uppercase tracking-wider">Clase particular</span>
                                        </div>
                                        <p className="text-lg font-bold text-slate-800 tracking-tight">
                                            {formatPrice(clase.precio_individual)}
                                        </p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">Pago único por clase</p>
                                    </div>
                                    {canEnroll ? (
                                        <div className="space-y-2">
                                            <button
                                                type="button"
                                                onClick={handleInscribirse}
                                                disabled={checkLoading}
                                                className="w-full py-2.5 px-3 rounded-lg bg-cef-primary text-white text-xs font-semibold hover:bg-cef-primary/90 transition-all flex items-center justify-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
                                            >
                                                {checkLoading ? (
                                                    <>
                                                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        Verificando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>Inscribirme</span>
                                                        <ChevronRight size={14} />
                                                    </>
                                                )}
                                            </button>
                                            {checkError && (
                                                <div className="flex items-start gap-1.5">
                                                    <AlertCircle size={13} className="text-cef-danger mt-0.5 flex-shrink-0" />
                                                    <p className="text-[11px] text-cef-danger leading-tight">{checkError}</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled
                                            className="w-full py-2.5 px-3 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-400 cursor-not-allowed group-hover:border-slate-300 transition-all flex items-center justify-center gap-1.5"
                                        >
                                            {!clase.instancia
                                                ? <span>Sin cupo individual</span>
                                                : clase.instancia.cancelada
                                                    ? <span>Clase cancelada</span>
                                                    : <span>Clase pasada</span>
                                            }
                                        </button>
                                    )}
                                </div>

                                <div className="rounded-xl p-4 border border-cef-primary/30 bg-cef-primary/5 flex flex-col justify-between space-y-4 group">
                                    <div>
                                        <div className="flex items-center gap-1.5 text-cef-primary/70 mb-1">
                                            <DollarSign size={14} />
                                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Suscripción mensual</span>
                                        </div>
                                        <p className="text-lg font-bold text-cef-primary tracking-tight">
                                            {formatPrice(clase.precio_suscripcion)}
                                            <span className="text-xs text-slate-400 font-normal ml-1">/ mes</span>
                                        </p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">Acceso mensual garantizado</p>
                                    </div>
                                    <button
                                        type="button"
                                        disabled
                                        className="w-full py-2.5 px-3 rounded-lg bg-cef-primary/10 border border-cef-primary/20 text-xs font-semibold text-cef-primary/60 cursor-not-allowed group-hover:border-cef-primary/30 transition-all flex items-center justify-center gap-1.5"
                                    >
                                        <span>Suscribirme</span>
                                        <span className="text-[10px] bg-cef-primary/15 px-1.5 py-0.5 rounded text-cef-primary/80 font-normal">Próximamente</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Body — Step: amount */}
                    {step === "amount" && (
                        <div className="px-6 py-5 space-y-5">
                            <p className="text-sm text-slate-600">
                                Elegí cómo querés abonar la clase de <span className="font-semibold text-slate-800">{clase.nombre}</span>.
                            </p>

                            <div className="space-y-3">
                                {/* Full payment option */}
                                <button
                                    type="button"
                                    onClick={() => setPaymentType("full")}
                                    className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                                        paymentType === "full"
                                            ? "border-cef-primary bg-cef-primary/5"
                                            : "border-slate-200 hover:border-slate-300"
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">Pago completo</p>
                                            <p className="text-xs text-slate-400 mt-0.5">Abonás el monto total ahora</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-slate-800">{formatPrice(precio)}</p>
                                        </div>
                                    </div>
                                </button>

                                {/* Partial payment option */}
                                <button
                                    type="button"
                                    onClick={() => setPaymentType("partial")}
                                    className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                                        paymentType === "partial"
                                            ? "border-cef-primary bg-cef-primary/5"
                                            : "border-slate-200 hover:border-slate-300"
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">Pago parcial</p>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                Mínimo {formatPrice(montoMinimo + 1)} (más del 50%)
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-400">A definir</p>
                                        </div>
                                    </div>
                                </button>

                                {paymentType === "partial" && (
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1.5">
                                            Ingresá el monto a pagar
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">$</span>
                                            <input
                                                type="number"
                                                min={montoMinimo + 1}
                                                max={precio}
                                                step="1"
                                                value={partialAmount}
                                                onChange={(e) => {
                                                    setPartialAmount(e.target.value);
                                                    setAmountError("");
                                                }}
                                                placeholder={`${Math.ceil(montoMinimo) + 1} – ${precio}`}
                                                className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-cef-primary/30 focus:border-cef-primary/50"
                                            />
                                        </div>
                                    </div>
                                )}

                                {amountError && (
                                    <p className="text-xs text-cef-danger">{amountError}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center gap-3">
                        {step === "detail" ? (
                            <button
                                type="button"
                                onClick={handleClose}
                                className="px-4 py-2 text-sm font-medium text-slate-500 rounded-lg hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                                Cerrar
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={() => { setStep("detail"); setAmountError(""); }}
                                    className="px-4 py-2 text-sm font-medium text-slate-500 rounded-lg hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                >
                                    Volver
                                </button>
                                <button
                                    type="button"
                                    onClick={handleContinuarPago}
                                    className="px-5 py-2 text-sm font-semibold bg-cef-primary text-white rounded-lg hover:bg-cef-primary/90 transition-colors flex items-center gap-1.5"
                                >
                                    Continuar
                                    <ChevronRight size={15} />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Mock Payment Modal (above everything) */}
            <MockPaymentModal
                isOpen={showPayment}
                monto={selectedMonto}
                onClose={handlePaymentClose}
                onPay={handlePay}
            />
        </>
    );
}
