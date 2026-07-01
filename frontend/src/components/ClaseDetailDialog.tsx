"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Clock, MapPin, User, Users, DollarSign, CalendarDays, ChevronRight, AlertCircle, ClipboardList, Calendar, Loader2, CheckCircle2 } from "lucide-react";
import { ClaseSemana, EstadoWaitlist, SuscripcionCheckResponse, AsistenciaRecepcion, TipoInscripcion } from "@/types/api";
import {
    anotarseWaitlist,
    anotarseWaitlistSuscripcion,
    cancelarWaitlist,
    cancelarWaitlistSuscripcion,
    checkElegibilidadIndividual,
    getMisWaitlist,
    getMisWaitlistSuscripcion,
    getWaitlistStatus,
    getWaitlistSuscripcionStatus,
} from "@/actions/inscripciones";
import { checkElegibilidadSuscripcion } from "@/actions/suscripciones";
import { getAsistenciasClase } from "@/actions/asistencias";
import {
    crearPreferenciaMP,
    crearPreferenciaSuscripcionMP,
    crearPreferenciaWaitlistMP,
    crearPreferenciaWaitlistSuscripcionMP,
} from "@/actions/pagos";

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

function isMoreThan24hAway(fechaStr: string, horaInicioStr: string): boolean {
    const [y, m, d] = fechaStr.split("-").map(Number);
    const [h, min] = horaInicioStr.split(":").map(Number);
    return new Date(y, m - 1, d, h, min).getTime() - Date.now() > 24 * 60 * 60 * 1000;
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
    porcentajeSena: number;
    paymentType: "full" | "partial";
    partialAmount: string;
    amountError: string;
    onTypeChange: (type: "full" | "partial") => void;
    onAmountChange: (value: string) => void;
    allowPartial?: boolean;
}

function PaymentAmountStep({
    inputId, precioActual, montoMinimoActual, porcentajeSena, paymentType,
    partialAmount, amountError, onTypeChange, onAmountChange,
    allowPartial = true,
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

            {allowPartial ? (
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
                                Mínimo {formatPrice(montoMinimoActual)} ({porcentajeSena}% o más)
                            </p>
                        </div>
                        <p className="text-xs text-slate-400">A definir</p>
                    </div>
                </button>
            ) : null}

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
                            min={montoMinimoActual}
                            max={precioActual - 1}
                            step="1"
                            value={partialAmount}
                            onChange={(e) => onAmountChange(e.target.value)}
                            placeholder={`${montoMinimoActual} – ${precioActual - 1}`}
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
    senaMinima = "50",
}: {
    clase: ClaseSemana | null;
    isOpen: boolean;
    onClose: () => void;
    userRole: string | null;
    senaMinima?: string;
}) {
    // All hooks must be called unconditionally at the top level
    const porcentajeSena = parseFloat(senaMinima) || 50;
    const [step, setStep] = useState<Step>("detail");
    const [paymentType, setPaymentType] = useState<"full" | "partial">("full");
    const [partialAmount, setPartialAmount] = useState("");
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
    const [asistenciasError, setAsistenciasError] = useState("");

    const [waitlistLoading, setWaitlistLoading] = useState(false);
    const [waitlistError, setWaitlistError] = useState("");
    const [waitlistEntryId, setWaitlistEntryId] = useState<string | null>(null);
    const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
    const [waitlistEstado, setWaitlistEstado] = useState<EstadoWaitlist | null>(null);
    const [waitlistExpiraAt, setWaitlistExpiraAt] = useState<string | null>(null);

    const [waitlistSuscripcionLoading, setWaitlistSuscripcionLoading] = useState(false);
    const [waitlistSuscripcionError, setWaitlistSuscripcionError] = useState("");
    const [waitlistSuscripcionEntryId, setWaitlistSuscripcionEntryId] = useState<string | null>(null);
    const [waitlistSuscripcionPosition, setWaitlistSuscripcionPosition] = useState<number | null>(null);
    const [waitlistSuscripcionEstado, setWaitlistSuscripcionEstado] = useState<EstadoWaitlist | null>(null);
    const [waitlistSuscripcionExpiraAt, setWaitlistSuscripcionExpiraAt] = useState<string | null>(null);

    // Load waitlist entries on open
    useEffect(() => {
        let mounted = true;

        async function loadMyWaitlist() {
            if (!isOpen || !clase || userRole !== "cliente") return;
            const entries = await getMisWaitlist();
            if (!mounted) return;

            const current = entries.find(
                (entry) =>
                    entry.clase_template_id === clase.id &&
                    entry.fecha === clase.fecha_en_semana,
            );

            const entriesSuscripcion = await getMisWaitlistSuscripcion();
            if (!mounted) return;

            const currentSuscripcion = entriesSuscripcion.find(
                (entry) =>
                    entry.clase_template_id === clase.id &&
                    entry.fecha === clase.fecha_en_semana,
            );

            setWaitlistEntryId(current?.id ?? null);
            setWaitlistPosition(current?.posicion ?? null);
            setWaitlistEstado(current?.estado ?? null);
            setWaitlistExpiraAt(current?.expira_at ?? null);
            setWaitlistError("");

            setWaitlistSuscripcionEntryId(currentSuscripcion?.id ?? null);
            setWaitlistSuscripcionPosition(currentSuscripcion?.posicion ?? null);
            setWaitlistSuscripcionEstado(currentSuscripcion?.estado ?? null);
            setWaitlistSuscripcionExpiraAt(currentSuscripcion?.expira_at ?? null);
            setWaitlistSuscripcionError("");
        }

        loadMyWaitlist();
        return () => {
            mounted = false;
        };
    }, [isOpen, clase, userRole]);

    // Poll waitlist status every 30 seconds
    useEffect(() => {
        if (!isOpen || !waitlistEntryId) return;

        const refreshStatus = async () => {
            const status = await getWaitlistStatus(waitlistEntryId);
            if (!status) return;
            setWaitlistEstado(status.estado);
            setWaitlistPosition(status.posicion);
            setWaitlistExpiraAt(status.expira_at);
            if (status.estado === EstadoWaitlist.EXPIRADO) {
                setWaitlistError("Tu aviso de cupo expiró. Podés volver a anotarte en espera.");
                setWaitlistEntryId(null);
                setWaitlistEstado(null);
                setWaitlistExpiraAt(null);
                setWaitlistPosition(null);
            }
        };

        refreshStatus();
        const interval = setInterval(refreshStatus, 30000);
        return () => clearInterval(interval);
    }, [isOpen, waitlistEntryId]);

    useEffect(() => {
        if (!isOpen || !waitlistSuscripcionEntryId) return;

        const refreshStatus = async () => {
            const status = await getWaitlistSuscripcionStatus(waitlistSuscripcionEntryId);
            if (!status) return;
            setWaitlistSuscripcionEstado(status.estado);
            setWaitlistSuscripcionPosition(status.posicion);
            setWaitlistSuscripcionExpiraAt(status.expira_at);
            if (status.estado === EstadoWaitlist.EXPIRADO) {
                setWaitlistSuscripcionError("Tu aviso de cupo de suscripción expiró. Podés volver a anotarte en espera.");
                setWaitlistSuscripcionEntryId(null);
                setWaitlistSuscripcionEstado(null);
                setWaitlistSuscripcionExpiraAt(null);
                setWaitlistSuscripcionPosition(null);
            }
        };

        refreshStatus();
        const interval = setInterval(refreshStatus, 30000);
        return () => clearInterval(interval);
    }, [isOpen, waitlistSuscripcionEntryId]);

    // Early return after all hooks
    if (!isOpen || !clase) return null;

    const canEnroll =
        !clase.instancia?.cancelada &&
        !hasClaseEmpezado(clase.fecha_en_semana, clase.hora_inicio);
    const canEnrollIndividual = canEnroll && clase.cupo_disponible > 0;
    const canSubscribe = clase.cupo_suscripcion_disponible;
    const hasWaitlistEntry = waitlistEntryId !== null;
    const waitlistNotificado = waitlistEstado === EstadoWaitlist.NOTIFICADO;
    const hasWaitlistSuscripcionEntry = waitlistSuscripcionEntryId !== null;
    const waitlistSuscripcionNotificado = waitlistSuscripcionEstado === EstadoWaitlist.NOTIFICADO;

    const precioActual = step === "amount-suscripcion"
        ? (suscripcionData?.precio_total ?? clase.precio_suscripcion)
        : clase.precio_individual;
    const montoMinimoActual = step === "amount-suscripcion"
        ? (suscripcionData?.monto_minimo ?? clase.precio_suscripcion * porcentajeSena / 100)
        : clase.precio_individual * porcentajeSena / 100;
    const partialAmountValue = parseFloat(partialAmount);
    const selectedMonto =
        paymentType === "full"
            ? precioActual
            : Number.isFinite(partialAmountValue)
                ? partialAmountValue
                : 0;
    const isPartialAmountValid =
        paymentType !== "partial" ||
        (Number.isFinite(partialAmountValue) &&
            partialAmountValue >= montoMinimoActual &&
            partialAmountValue < precioActual);
    const canContinuePayment = !mpLoading && isPartialAmountValid;

    function handleClose() {
        setStep("detail");
        setPaymentType("full");
        setPartialAmount("");
        setAmountError("");
        setCheckError("");
        setMpLoading(false);
        setMpError("");
        setSuscripcionData(null);
        setSuscripcionCheckLoading(false);
        setSuscripcionCheckError("");
        setAsistencias([]);
        setAsistenciasLoading(false);
        setAsistenciasError("");
        setWaitlistLoading(false);
        setWaitlistError("");
        setWaitlistEntryId(null);
        setWaitlistPosition(null);
        setWaitlistEstado(null);
        setWaitlistExpiraAt(null);
        setWaitlistSuscripcionLoading(false);
        setWaitlistSuscripcionError("");
        setWaitlistSuscripcionEntryId(null);
        setWaitlistSuscripcionPosition(null);
        setWaitlistSuscripcionEstado(null);
        setWaitlistSuscripcionExpiraAt(null);
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
        setPaymentType("full");
        setPartialAmount("");
        setStep("amount");
    }

    async function handleSuscribirse() {
        if (!clase) return;
        setSuscripcionCheckLoading(true);
        setSuscripcionCheckError("");
        const result = await checkElegibilidadSuscripcion(clase.id, clase.fecha_en_semana);
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
        if (!isPartialAmountValid) {
            setAmountError(
                `El monto debe ser entre ${formatPrice(montoMinimoActual)} (${porcentajeSena}%) y ${formatPrice(precioActual-1)} (100%)`
            );
            return;
        }
        setAmountError("");
        if (!clase) return;
        setMpLoading(true);
        setMpError("");

        const result = step === "amount-suscripcion"
            ? await crearPreferenciaSuscripcionMP(clase.id, selectedMonto, clase.fecha_en_semana)
            : await crearPreferenciaMP(clase.id, clase.fecha_en_semana, selectedMonto);

        if (result.error) {
            setMpLoading(false);
            setMpError(result.error);
            return;
        }
        if (result.init_point) {
            window.location.href = result.init_point;
        }
    }

    async function handleVerAsistencias() {
        if (!clase) return;
        setAsistenciasLoading(true);
        setAsistenciasError("");
        const result = await getAsistenciasClase(clase.instancia!.id);
        setAsistenciasLoading(false);
        if (result.error) {
            setAsistenciasError(result.error);
            return;
        }
        setAsistencias(result.data);
        setStep("asistencias");
    }

    async function handleAnotarseWaitlist() {
        if (!clase) return;
        setWaitlistLoading(true);
        setWaitlistError("");

        const result = await anotarseWaitlist(clase.id, clase.fecha_en_semana);
        setWaitlistLoading(false);

        if (result.error || !result.data) {
            setWaitlistError(result.error || "No se pudo completar la espera");
            return;
        }

        setWaitlistEntryId(result.data.waitlist_id);
        setWaitlistPosition(result.data.posicion);
        setWaitlistEstado(result.data.estado);
        setWaitlistExpiraAt(null);
    }

    async function handleCancelarWaitlist() {
        if (!waitlistEntryId) return;
        setWaitlistLoading(true);
        setWaitlistError("");

        const result = await cancelarWaitlist(waitlistEntryId);
        setWaitlistLoading(false);

        if (result.error) {
            setWaitlistError(result.error);
            return;
        }

        setWaitlistEntryId(null);
        setWaitlistPosition(null);
        setWaitlistEstado(null);
        setWaitlistExpiraAt(null);
    }

    async function handleConfirmarWaitlistPago() {
        if (!waitlistEntryId) return;
        setWaitlistLoading(true);
        setWaitlistError("");

        const result = await crearPreferenciaWaitlistMP(waitlistEntryId);
        setWaitlistLoading(false);

        if (result.error) {
            setWaitlistError(result.error);
            return;
        }

        if (result.init_point) {
            window.location.href = result.init_point;
        }
    }

    async function handleAnotarseWaitlistSuscripcion() {
        if (!clase) return;
        setWaitlistSuscripcionLoading(true);
        setWaitlistSuscripcionError("");

        const result = await anotarseWaitlistSuscripcion(clase.id, clase.fecha_en_semana);
        setWaitlistSuscripcionLoading(false);

        if (result.error || !result.data) {
            setWaitlistSuscripcionError(result.error || "No se pudo completar la espera de suscripción");
            return;
        }

        setWaitlistSuscripcionEntryId(result.data.waitlist_id);
        setWaitlistSuscripcionPosition(result.data.posicion);
        setWaitlistSuscripcionEstado(result.data.estado);
        setWaitlistSuscripcionExpiraAt(null);
    }

    async function handleCancelarWaitlistSuscripcion() {
        if (!waitlistSuscripcionEntryId) return;
        setWaitlistSuscripcionLoading(true);
        setWaitlistSuscripcionError("");

        const result = await cancelarWaitlistSuscripcion(waitlistSuscripcionEntryId);
        setWaitlistSuscripcionLoading(false);

        if (result.error) {
            setWaitlistSuscripcionError(result.error);
            return;
        }

        setWaitlistSuscripcionEntryId(null);
        setWaitlistSuscripcionPosition(null);
        setWaitlistSuscripcionEstado(null);
        setWaitlistSuscripcionExpiraAt(null);
    }

    async function handleConfirmarWaitlistSuscripcionPago() {
        if (!waitlistSuscripcionEntryId) return;
        setWaitlistSuscripcionLoading(true);
        setWaitlistSuscripcionError("");

        const result = await crearPreferenciaWaitlistSuscripcionMP(waitlistSuscripcionEntryId);
        setWaitlistSuscripcionLoading(false);

        if (result.error) {
            setWaitlistSuscripcionError(result.error);
            return;
        }

        if (result.init_point) {
            window.location.href = result.init_point;
        }
    }

    function renderVencimiento(expiraAt: string | null) {
        if (!expiraAt) return null;
        const expireDate = new Date(expiraAt);
        const diffMs = expireDate.getTime() - Date.now();
        if (diffMs <= 0) return "Expirando";
        const mins = Math.floor(diffMs / 60000);
        if (mins < 60) return `Expira en ${mins} min`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) {
            const remMins = mins % 60;
            return `Expira en ${hours}h ${remMins}m`;
        }
        const days = Math.floor(hours / 24);
        const remHours = hours % 24;
        return `Expira en ${days}d ${remHours}h`;
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
                                        {clase.inscrito ? (
                                            <div className="w-full py-2.5 px-3 rounded-lg bg-cef-success/10 border border-cef-success/20 text-xs font-semibold text-cef-success flex items-center justify-center gap-1.5">
                                                <CheckCircle2 size={14} />
                                                Inscripto
                                            </div>
                                        ) : clase.suscrito ? (
                                            <button type="button" disabled className="w-full py-2.5 px-3 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-400 cursor-not-allowed flex items-center justify-center gap-1.5">
                                                Ya tenés suscripción
                                            </button>
                                        ) : canEnrollIndividual ? (
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
                                        ) : canEnroll ? (
                                            <div className="space-y-2">
                                                {hasWaitlistEntry ? (
                                                    <>
                                                        <div className={`w-full py-2.5 px-3 rounded-lg border text-xs font-semibold text-center leading-tight ${
                                                            waitlistNotificado
                                                                ? "bg-cef-warning/10 border-cef-warning/20 text-cef-warning"
                                                                : "bg-cef-success/10 border-cef-success/20 text-cef-success"
                                                        }`}>
                                                            {waitlistNotificado
                                                                ? `¡Se liberó tu cupo! ${renderVencimiento(waitlistExpiraAt) ?? "Confirmá tu lugar"}`
                                                                : `Estás en lista de espera${waitlistPosition ? ` · Posición #${waitlistPosition}` : ""}`}
                                                        </div>
                                                        {waitlistNotificado && (
                                                            <button
                                                                type="button"
                                                                onClick={handleConfirmarWaitlistPago}
                                                                disabled={waitlistLoading}
                                                                className="w-full py-2.5 px-3 rounded-lg bg-cef-primary text-white text-xs font-semibold hover:bg-cef-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                                            >
                                                                {waitlistLoading ? "Redirigiendo..." : "Confirmar Lugar"}
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={handleCancelarWaitlist}
                                                            disabled={waitlistLoading}
                                                            className="w-full py-2.5 px-3 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                                        >
                                                            {waitlistLoading ? "Cancelando..." : "Cancelar espera"}
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={handleAnotarseWaitlist}
                                                        disabled={waitlistLoading || !clase.waitlist_disponible}
                                                        className="w-full py-2.5 px-3 rounded-lg bg-cef-primary text-white text-xs font-semibold hover:bg-cef-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                                    >
                                                        {waitlistLoading ? "Anotando..." : "Anotarme en lista de espera"}
                                                    </button>
                                                )}
                                                <p className="text-[11px] text-slate-400 text-center">
                                                    {waitlistNotificado
                                                        ? "Tu lugar se asegura únicamente con pago aprobado"
                                                        : clase.waitlist_total > 0
                                                        ? `${clase.waitlist_total} persona${clase.waitlist_total === 1 ? "" : "s"} en espera`
                                                        : "Todavía no hay personas en espera"}
                                                </p>
                                                {waitlistError && (
                                                    <div className="flex items-start gap-1.5">
                                                        <AlertCircle size={13} className="text-cef-danger mt-0.5 flex-shrink-0" />
                                                        <p className="text-[11px] text-cef-danger leading-tight">{waitlistError}</p>
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
                                        {clase.suscrito ? (
                                            <div className="w-full py-2.5 px-3 rounded-lg bg-cef-success/10 border border-cef-success/20 text-xs font-semibold text-cef-success flex items-center justify-center gap-1.5">
                                                <CheckCircle2 size={14} />
                                                Suscripto
                                            </div>
                                        ) : clase.inscrito ? (
                                            <button type="button" disabled className="w-full py-2.5 px-3 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-400 cursor-not-allowed flex items-center justify-center gap-1.5">
                                                Ya tenés inscripción
                                            </button>
                                        ) : !canSubscribe ? (
                                            <div className="space-y-2">
                                                {hasWaitlistSuscripcionEntry ? (
                                                    <>
                                                        <div className={`w-full py-2.5 px-3 rounded-lg border text-xs font-semibold text-center leading-tight ${
                                                            waitlistSuscripcionNotificado
                                                                ? "bg-cef-warning/10 border-cef-warning/20 text-cef-warning"
                                                                : "bg-cef-success/10 border-cef-success/20 text-cef-success"
                                                        }`}>
                                                            {waitlistSuscripcionNotificado
                                                                ? `¡Se liberó tu cupo de suscripción! ${renderVencimiento(waitlistSuscripcionExpiraAt) ?? "Confirmá tu lugar"}`
                                                                : `Estás en lista de espera de suscripción${waitlistSuscripcionPosition ? ` · Posición #${waitlistSuscripcionPosition}` : ""}`}
                                                        </div>
                                                        {waitlistSuscripcionNotificado && (
                                                            <button
                                                                type="button"
                                                                onClick={handleConfirmarWaitlistSuscripcionPago}
                                                                disabled={waitlistSuscripcionLoading}
                                                                className="w-full py-2.5 px-3 rounded-lg bg-cef-primary text-white text-xs font-semibold hover:bg-cef-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                                            >
                                                                {waitlistSuscripcionLoading ? "Redirigiendo..." : "Confirmar Suscripción"}
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={handleCancelarWaitlistSuscripcion}
                                                            disabled={waitlistSuscripcionLoading}
                                                            className="w-full py-2.5 px-3 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                                        >
                                                            {waitlistSuscripcionLoading ? "Cancelando..." : "Cancelar espera"}
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={handleAnotarseWaitlistSuscripcion}
                                                        disabled={waitlistSuscripcionLoading}
                                                        className="w-full py-2.5 px-3 rounded-lg bg-cef-primary text-white text-xs font-semibold hover:bg-cef-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                                    >
                                                        {waitlistSuscripcionLoading ? "Anotando..." : "Anotarme en lista de espera"}
                                                    </button>
                                                )}
                                                <p className="text-[11px] text-slate-400 text-center">
                                                    {waitlistSuscripcionNotificado
                                                        ? "Tu suscripción se confirma únicamente con pago aprobado"
                                                        : "No hay cupo de suscripción disponible para este período"}
                                                </p>
                                                {waitlistSuscripcionError && (
                                                    <div className="flex items-start gap-1.5">
                                                        <AlertCircle size={13} className="text-cef-danger mt-0.5 flex-shrink-0" />
                                                        <p className="text-[11px] text-cef-danger leading-tight">{waitlistSuscripcionError}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
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
                                        )}
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
                                                <span>
                                                    {clase.instancia
                                                        ? "Ver asistencias"
                                                        : "Sin asistencias para esta fecha"}
                                                </span>
                                            </>
                                        )}
                                    </button>
                                    {asistenciasError && (
                                        <p className="mt-2 text-xs text-cef-danger text-center">
                                            {asistenciasError}
                                        </p>
                                    )}
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
                                porcentajeSena={porcentajeSena}
                                paymentType={paymentType}
                                partialAmount={partialAmount}
                                amountError={amountError}
                                onTypeChange={setPaymentType}
                                onAmountChange={(v) => { setPartialAmount(v); setAmountError(""); }}
                                allowPartial={isMoreThan24hAway(clase.fecha_en_semana, clase.hora_inicio)}
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
                                porcentajeSena={porcentajeSena}
                                paymentType={paymentType}
                                partialAmount={partialAmount}
                                amountError={amountError}
                                onTypeChange={setPaymentType}
                                onAmountChange={(v) => { setPartialAmount(v); setAmountError(""); }}
                                allowPartial={false}
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
                                    disabled={!canContinuePayment}
                                    className="px-5 py-2 text-sm font-semibold bg-cef-primary text-white rounded-lg hover:bg-cef-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
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

        </>,
        document.body
    );
}
