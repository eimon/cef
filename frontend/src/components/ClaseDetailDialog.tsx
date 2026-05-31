"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Clock, MapPin, User, Users, DollarSign, CalendarDays, ChevronRight, AlertCircle, ClipboardList, Calendar, Loader2 } from "lucide-react";
import { ClaseSemana, SuscripcionCheckResponse, AsistenciaRecepcion, TipoInscripcion } from "@/types/api";
import { checkElegibilidadIndividual } from "@/actions/inscripciones";
import { checkElegibilidadSuscripcion, suscribirse } from "@/actions/suscripciones";
import { getAsistenciasClase } from "@/actions/asistencias";
import { crearPreferenciaMP } from "@/actions/pagos";
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

const fmtPrice = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 });
const fmtFechaLarga = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const fmtFechaCorta = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long" });
const fmtFechaChip  = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" });

function formatTime(time: string) {
    return time.slice(0, 5);
}

function formatPrice(price: number) {
    return fmtPrice.format(price);
}

function formatFechaLarga(fechaStr: string): string {
    const [y, m, d] = fechaStr.split("-").map(Number);
    return fmtFechaLarga.format(new Date(y, m - 1, d));
}

function formatFechaCorta(fechaStr: string): string {
    const [y, m, d] = fechaStr.split("-").map(Number);
    return fmtFechaCorta.format(new Date(y, m - 1, d));
}

function formatFechaChip(fechaStr: string): string {
    const [y, m, d] = fechaStr.split("-").map(Number);
    return fmtFechaChip.format(new Date(y, m - 1, d));
}

function hasClaseEmpezado(fechaStr: string, horaInicioStr: string): boolean {
    const [y, m, d] = fechaStr.split("-").map(Number);
    const [h, min] = horaInicioStr.split(":").map(Number);
    return new Date(y, m - 1, d, h, min) <= new Date();
}

function hasClaseTerminado(fechaStr: string, horaFinStr: string): boolean {
    const [y, m, d] = fechaStr.split("-").map(Number);
    const [h, min] = horaFinStr.split(":").map(Number);
    return new Date(y, m - 1, d, h, min) < new Date();
}

// ── Sub-components ───────────────────────────────────────────────────────────

interface PaymentAmountStepProps {
    inputId: string;
    precioActual: number;
    montoMinimoActual: number;
    paymentType: "full" | "partial";
    partialAmount: string;
    amountError: string;
    onTypeChange: (type: "full" | "partial") => void;
    onAmountChange: (value: string) => void;
}

function PaymentAmountStep({
    inputId, precioActual, montoMinimoActual, paymentType,
    partialAmount, amountError, onTypeChange, onAmountChange,
}: PaymentAmountStepProps) {
    return (
        <div className="space-y-3">
            <button
                type="button"
                onClick={() => onTypeChange("full")}
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
                    <p className="text-lg font-bold text-slate-800">{formatPrice(precioActual)}</p>
                </div>
            </button>

            <button
                type="button"
                onClick={() => onTypeChange("partial")}
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
                            Mínimo {formatPrice(montoMinimoActual + 1)} (más del 50%)
                        </p>
                    </div>
                    <p className="text-xs text-slate-400">A definir</p>
                </div>
            </button>

            {paymentType === "partial" && (
                <div>
                    <label htmlFor={inputId} className="block text-xs font-medium text-slate-600 mb-1.5">
                        Ingresá el monto a pagar
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">$</span>
                        <input
                            id={inputId}
                            type="number"
                            min={montoMinimoActual + 1}
                            max={precioActual}
                            step="1"
                            value={partialAmount}
                            onChange={(e) => onAmountChange(e.target.value)}
                            placeholder={`${Math.ceil(montoMinimoActual) + 1} – ${precioActual}`}
                            className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-cef-primary/30 focus:border-cef-primary/50"
                        />
                    </div>
                </div>
            )}

            {amountError && (
                <p className="text-xs text-cef-danger">{amountError}</p>
            )}
        </div>
    );
}

interface AsistenciasStepProps {
    asistencias: AsistenciaRecepcion[];
    clase: ClaseSemana;
}

function AsistenciasStep({ asistencias, clase }: AsistenciasStepProps) {
    if (asistencias.length === 0) {
        return <p className="text-sm text-slate-400 text-center py-8">Sin asistencias registradas</p>;
    }
    const terminada = hasClaseTerminado(clase.fecha_en_semana, clase.hora_fin);
    return (
        <ul className="space-y-2 max-h-72 overflow-y-auto">
            {asistencias.map((a) => {
                const estadoLabel = a.cancelo ? "Canceló" : a.asistio ? "Asistió" : terminada ? "Faltó" : "Pendiente";
                const estadoClass = a.cancelo
                    ? "bg-cef-danger/10 text-cef-danger border-cef-danger/20"
                    : a.asistio
                    ? "bg-cef-success/10 text-cef-success border-cef-success/20"
                    : terminada
                    ? "bg-slate-100 text-slate-500 border-slate-200"
                    : "bg-cef-warning/10 text-cef-warning border-cef-warning/20";
                return (
                    <li key={a.asistencia_id} className="glass rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-slate-800">{a.usuario_nombre}</p>
                            <p className="text-xs text-slate-400">
                                {a.tipo === TipoInscripcion.INDIVIDUAL ? "No abonado" : "Abonado"}
                            </p>
                        </div>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-md border ${estadoClass}`}>
                            {estadoLabel}
                        </span>
                    </li>
                );
            })}
        </ul>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

type Step = "detail" | "amount" | "amount-suscripcion" | "asistencias";

export default function ClaseDetailDialog({
    clase,
    isOpen,
    onClose,
    userRole,
}: {
    clase: ClaseSemana | null;
    isOpen: boolean;
    onClose: () => void;
    userRole: string | null;
}) {
    const [step, setStep] = useState<Step>("detail");
    const [paymentType, setPaymentType] = useState<"full" | "partial">("full");
    const [partialAmount, setPartialAmount] = useState("");
    const [showPayment, setShowPayment] = useState(false);
    const [amountError, setAmountError] = useState("");

    const [checkLoading, setCheckLoading] = useState(false);
    const [checkError, setCheckError] = useState("");
    const [mpLoading, setMpLoading] = useState(false);
    const [mpError, setMpError] = useState("");

    const [suscripcionData, setSuscripcionData] = useState<SuscripcionCheckResponse | null>(null);
    const [suscripcionCheckLoading, setSuscripcionCheckLoading] = useState(false);
    const [suscripcionCheckError, setSuscripcionCheckError] = useState("");

    const [asistencias, setAsistencias] = useState<AsistenciaRecepcion[]>([]);
    const [asistenciasLoading, setAsistenciasLoading] = useState(false);

    if (!isOpen || !clase) return null;

    const canEnroll =
        !clase.instancia?.cancelada &&
        !hasClaseEmpezado(clase.fecha_en_semana, clase.hora_inicio);

    const precioActual = step === "amount-suscripcion"
        ? (suscripcionData?.precio_total ?? clase.precio_suscripcion)
        : clase.precio_individual;
    const montoMinimoActual = step === "amount-suscripcion"
        ? (suscripcionData?.monto_minimo ?? clase.precio_suscripcion / 2)
        : clase.precio_individual / 2;
    const selectedMonto =
        paymentType === "full"
            ? precioActual
            : parseFloat(partialAmount) || 0;

    function handleClose() {
        setStep("detail");
        setPaymentType("full");
        setPartialAmount("");
        setAmountError("");
        setCheckError("");
        setMpLoading(false);
        setMpError("");
        setShowPayment(false);
        setSuscripcionData(null);
        setSuscripcionCheckLoading(false);
        setSuscripcionCheckError("");
        setAsistencias([]);
        setAsistenciasLoading(false);
        onClose();
    }

    async function handleInscribirse() {
        if (!clase) return;
        setCheckLoading(true);
        setCheckError("");
        const result = await checkElegibilidadIndividual(clase.id, clase.fecha_en_semana);
        setCheckLoading(false);
        if (result.error) {
            setCheckError(result.error);
            return;
        }
        setStep("amount");
    }

    async function handleSuscribirse() {
        if (!clase) return;
        setSuscripcionCheckLoading(true);
        setSuscripcionCheckError("");
        const result = await checkElegibilidadSuscripcion(clase.id);
        setSuscripcionCheckLoading(false);
        if (result.error) {
            setSuscripcionCheckError(result.error);
            return;
        }
        setSuscripcionData(result.data!);
        setPaymentType("full");
        setPartialAmount("");
        setStep("amount-suscripcion");
    }

    async function handleContinuarPago() {
        if (paymentType === "partial") {
            const monto = parseFloat(partialAmount);
            if (isNaN(monto) || monto <= montoMinimoActual || monto > precioActual) {
                setAmountError(
                    `El monto parcial debe ser mayor al 50% (${formatPrice(montoMinimoActual)}) y menor o igual al precio completo`
                );
                return;
            }
        }
        setAmountError("");

        if (step === "amount-suscripcion") {
            setShowPayment(true);
            return;
        }

        // Individual: redirect to MercadoPago checkout
        if (!clase) return;
        setMpLoading(true);
        setMpError("");
        const result = await crearPreferenciaMP(clase.id, clase.fecha_en_semana, selectedMonto);
        if (result.error) {
            setMpLoading(false);
            setMpError(result.error);
            return;
        }
        if (result.init_point) {
            window.location.href = result.init_point;
        }
    }

    async function handlePay() {
        if (!clase) return { error: "Clase no disponible" };
        return await suscribirse(clase.id, selectedMonto);
    }

    function handlePaymentClose() {
        setShowPayment(false);
        handleClose();
    }

    async function handleVerAsistencias() {
        if (!clase) return;
        setAsistenciasLoading(true);
        const data = await getAsistenciasClase(clase.instancia!.id);
        setAsistenciasLoading(false);
        setAsistencias(data);
        setStep("asistencias");
    }

    return createPortal(
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
                                        {clase.cupo_disponible} disponibles
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

                            {userRole === "cliente" ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                    {/* Clase individual */}
                                    <div className="glass rounded-xl p-4 flex flex-col justify-between gap-4 group">
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
                                                            <span className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                            Verificando…
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
                                                {clase.instancia?.cancelada
                                                    ? <span>Clase cancelada</span>
                                                    : <span>Clase pasada</span>
                                                }
                                            </button>
                                        )}
                                    </div>

                                    {/* Suscripción mensual */}
                                    <div className="rounded-xl p-4 border border-cef-primary/30 bg-cef-primary/5 flex flex-col justify-between gap-4 group">
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
                                        <div className="space-y-2">
                                            <button
                                                type="button"
                                                onClick={handleSuscribirse}
                                                disabled={suscripcionCheckLoading}
                                                className="w-full py-2.5 px-3 rounded-lg bg-cef-primary text-white text-xs font-semibold hover:bg-cef-primary/90 transition-all flex items-center justify-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
                                            >
                                                {suscripcionCheckLoading ? (
                                                    <>
                                                        <span className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                        Verificando…
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>Suscribirme</span>
                                                        <ChevronRight size={14} />
                                                    </>
                                                )}
                                            </button>
                                            {suscripcionCheckError && (
                                                <div className="flex items-start gap-1.5">
                                                    <AlertCircle size={13} className="text-cef-danger mt-0.5 flex-shrink-0" />
                                                    <p className="text-[11px] text-cef-danger leading-tight">{suscripcionCheckError}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="pt-2">
                                    <button
                                        type="button"
                                        onClick={handleVerAsistencias}
                                        disabled={!clase.instancia || asistenciasLoading}
                                        className="w-full py-3 px-4 rounded-xl bg-slate-100 border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors disabled:text-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {asistenciasLoading ? (
                                            <>
                                                <span className="size-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
                                                Cargando…
                                            </>
                                        ) : (
                                            <>
                                                <ClipboardList size={16} />
                                                <span>Ver asistencias</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Body — Step: amount (individual) */}
                    {step === "amount" && (
                        <div className="px-6 py-5 space-y-5">
                            <p className="text-sm text-slate-600">
                                Elegí cómo querés abonar la clase de <span className="font-semibold text-slate-800">{clase.nombre}</span>.
                            </p>
                            <PaymentAmountStep
                                inputId="individual-amount"
                                precioActual={precioActual}
                                montoMinimoActual={montoMinimoActual}
                                paymentType={paymentType}
                                partialAmount={partialAmount}
                                amountError={amountError}
                                onTypeChange={setPaymentType}
                                onAmountChange={(v) => { setPartialAmount(v); setAmountError(""); }}
                            />
                        </div>
                    )}

                    {/* Body — Step: amount-suscripcion */}
                    {step === "amount-suscripcion" && suscripcionData && (
                        <div className="px-6 py-5 space-y-5">
                            <div className="glass rounded-xl p-4 space-y-3">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Período de suscripción</p>
                                <div className="flex items-center gap-2 text-sm text-slate-700">
                                    <Calendar size={14} className="text-cef-primary flex-shrink-0" />
                                    <span>
                                        Del{" "}
                                        <span className="font-semibold">{formatFechaCorta(suscripcionData.fecha_inicio)}</span>
                                        {" "}al{" "}
                                        <span className="font-semibold">{formatFechaCorta(suscripcionData.fecha_fin)}</span>
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {suscripcionData.fechas_clases.map((f) => (
                                        <span
                                            key={f}
                                            className="text-[10px] px-2 py-0.5 rounded-md bg-cef-primary/10 text-cef-primary font-medium border border-cef-primary/20 capitalize"
                                        >
                                            {formatFechaChip(f)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <PaymentAmountStep
                                inputId="suscripcion-amount"
                                precioActual={precioActual}
                                montoMinimoActual={montoMinimoActual}
                                paymentType={paymentType}
                                partialAmount={partialAmount}
                                amountError={amountError}
                                onTypeChange={setPaymentType}
                                onAmountChange={(v) => { setPartialAmount(v); setAmountError(""); }}
                            />
                        </div>
                    )}

                    {/* Body — Step: asistencias */}
                    {step === "asistencias" && (
                        <div className="px-6 py-5">
                            <AsistenciasStep asistencias={asistencias} clase={clase} />
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
                        ) : step === "asistencias" ? (
                            <button
                                type="button"
                                onClick={() => setStep("detail")}
                                className="px-4 py-2 text-sm font-medium text-slate-500 rounded-lg hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                                Volver
                            </button>
                        ) : (
                            <>
                                <div className="flex-1">
                                    {mpError && (
                                        <p className="text-xs text-cef-danger flex items-center gap-1.5">
                                            <AlertCircle size={13} className="flex-shrink-0" />
                                            {mpError}
                                        </p>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setStep("detail"); setAmountError(""); setMpError(""); }}
                                    className="px-4 py-2 text-sm font-medium text-slate-500 rounded-lg hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                >
                                    Volver
                                </button>
                                <button
                                    type="button"
                                    onClick={handleContinuarPago}
                                    disabled={mpLoading}
                                    className="px-5 py-2 text-sm font-semibold bg-cef-primary text-white rounded-lg hover:bg-cef-primary/90 disabled:opacity-60 transition-colors flex items-center gap-1.5"
                                >
                                    {mpLoading ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            Redirigiendo...
                                        </>
                                    ) : step === "amount" ? (
                                        <>
                                            Pagar con MercadoPago
                                            <ChevronRight size={15} />
                                        </>
                                    ) : (
                                        <>
                                            Continuar
                                            <ChevronRight size={15} />
                                        </>
                                    )}
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
        </>,
        document.body
    );
}
