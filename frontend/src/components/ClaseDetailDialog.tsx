"use client";

import { X, Clock, MapPin, User, Users, DollarSign, CalendarDays } from "lucide-react";
import { ClaseSemana } from "@/types/api";

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

export default function ClaseDetailDialog({
    clase,
    isOpen,
    onClose,
}: {
    clase: ClaseSemana | null;
    isOpen: boolean;
    onClose: () => void;
}) {
    if (!isOpen || !clase) return null;

    return (
        <>
            {/* Backdrop */}
            <button
                type="button"
                aria-label="Cerrar detalle"
                className="fixed inset-0 z-50 w-full bg-black/70 backdrop-blur-sm transition-opacity cursor-default"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div className="glass-modal rounded-2xl shadow-2xl w-full max-w-lg pointer-events-auto animate-in fade-in zoom-in-95 duration-200 border border-white/[0.1]">
                    {/* Header */}
                    <div className="relative px-6 pt-6 pb-4 border-b border-white/[0.07]">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-white/90 tracking-tight">{clase.nombre}</h2>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-cef-primary/10 text-cef-primary border border-cef-primary/20 capitalize">
                                        <CalendarDays size={13} />
                                        {DIA_LABELS[clase.dia_semana] ?? clase.dia_semana}
                                    </span>
                                    <span className="text-xs text-white/40 capitalize">
                                        {formatFechaLarga(clase.fecha_en_semana)}
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-shrink-0 p-1.5 text-white/40 rounded-lg hover:text-white/70 hover:bg-white/[0.06] transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="px-6 py-5 space-y-5">
                        {clase.descripcion && (
                            <p className="text-sm text-white/60 leading-relaxed">{clase.descripcion}</p>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="glass rounded-xl p-3.5 space-y-1.5 border border-white/[0.03]">
                                <div className="flex items-center gap-2 text-white/40">
                                    <Clock size={14} />
                                    <span className="text-xs font-medium uppercase tracking-wider text-[10px]">Horario</span>
                                </div>
                                <p className="text-sm font-semibold text-white/90">
                                    {formatTime(clase.hora_inicio)} – {formatTime(clase.hora_fin)}
                                </p>
                            </div>

                            <div className="glass rounded-xl p-3.5 space-y-1.5 border border-white/[0.03]">
                                <div className="flex items-center gap-2 text-white/40">
                                    <User size={14} />
                                    <span className="text-xs font-medium uppercase tracking-wider text-[10px]">Profesor</span>
                                </div>
                                <p className="text-sm font-semibold text-white/90 truncate">
                                    {clase.profesor_nombre ?? "Sin asignar"}
                                </p>
                            </div>

                            <div className="glass rounded-xl p-3.5 space-y-1.5 border border-white/[0.03]">
                                <div className="flex items-center gap-2 text-white/40">
                                    <MapPin size={14} />
                                    <span className="text-xs font-medium uppercase tracking-wider text-[10px]">Sala</span>
                                </div>
                                <p className="text-sm font-semibold text-white/90 truncate">
                                    {clase.sala_nombre ?? "Sin asignar"}
                                </p>
                            </div>

                            <div className="glass rounded-xl p-3.5 space-y-1.5 border border-white/[0.03]">
                                <div className="flex items-center gap-2 text-white/40">
                                    <Users size={14} />
                                    <span className="text-xs font-medium uppercase tracking-wider text-[10px]">Cupo</span>
                                </div>
                                <p className="text-sm font-semibold text-white/90">
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
                            <div className="glass rounded-xl p-4 border border-white/[0.05] flex flex-col justify-between space-y-4 group">
                                <div>
                                    <div className="flex items-center gap-1.5 text-white/40 mb-1">
                                        <DollarSign size={14} />
                                        <span className="text-[10px] font-medium uppercase tracking-wider">Clase particular</span>
                                    </div>
                                    <p className="text-lg font-bold text-white/90 tracking-tight">
                                        {formatPrice(clase.precio_individual)}
                                    </p>
                                    <p className="text-[11px] text-white/40 mt-0.5">Pago único por clase</p>
                                </div>
                                <button
                                    type="button"
                                    disabled
                                    className="w-full py-2.5 px-3 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-white/40 cursor-not-allowed group-hover:border-white/20 transition-all flex items-center justify-center gap-1.5"
                                >
                                    <span>Inscribirme</span>
                                    <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/50 font-normal">Próximamente</span>
                                </button>
                            </div>

                            <div className="glass rounded-xl p-4 border border-cef-primary/20 bg-cef-primary/[0.02] flex flex-col justify-between space-y-4 group">
                                <div>
                                    <div className="flex items-center gap-1.5 text-cef-primary/70 mb-1">
                                        <DollarSign size={14} />
                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Suscripción mensual</span>
                                    </div>
                                    <p className="text-lg font-bold text-cef-primary tracking-tight">
                                        {formatPrice(clase.precio_suscripcion)}
                                        <span className="text-xs text-white/40 font-normal ml-1">/ mes</span>
                                    </p>
                                    <p className="text-[11px] text-white/40 mt-0.5">Acceso mensual garantizado</p>
                                </div>
                                <button
                                    type="button"
                                    disabled
                                    className="w-full py-2.5 px-3 rounded-lg bg-cef-primary/10 border border-cef-primary/20 text-xs font-semibold text-cef-primary/50 cursor-not-allowed group-hover:border-cef-primary/30 transition-all flex items-center justify-center gap-1.5"
                                >
                                    <span>Suscribirme</span>
                                    <span className="text-[10px] bg-cef-primary/20 px-1.5 py-0.5 rounded text-cef-primary/70 font-normal">Próximamente</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-4 border-t border-white/[0.07] flex justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-white/60 rounded-lg hover:text-white/90 hover:bg-white/[0.06] transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
