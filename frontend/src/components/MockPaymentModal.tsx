"use client";

import { useState } from "react";
import { X, CreditCard, Lock, CheckCircle, AlertCircle } from "lucide-react";

function formatCardNumber(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string): string {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
}

function formatPrice(price: number) {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        minimumFractionDigits: 0,
    }).format(price);
}

type Props = {
    isOpen: boolean;
    monto: number;
    onClose: () => void;
    onPay: () => Promise<{ error?: string; success?: boolean }>;
};

type Status = "idle" | "loading" | "success" | "error";

export default function MockPaymentModal({ isOpen, monto, onClose, onPay }: Props) {
    const [cardNumber, setCardNumber] = useState("");
    const [cardName, setCardName] = useState("");
    const [expiry, setExpiry] = useState("");
    const [cvv, setCvv] = useState("");
    const [status, setStatus] = useState<Status>("idle");
    const [errorMessage, setErrorMessage] = useState("");

    if (!isOpen) return null;

    const rawCardNumber = cardNumber.replace(/\s/g, "");
    const isValid =
        rawCardNumber.length === 16 &&
        cardName.trim().length > 0 &&
        expiry.length === 5 &&
        cvv.length === 3;

    async function handlePay() {
        if (!isValid) return;
        setStatus("loading");
        const result = await onPay();
        if (result.success) {
            setStatus("success");
        } else {
            setStatus("error");
            setErrorMessage(result.error || "Error al procesar el pago");
        }
    }

    function handleClose() {
        setCardNumber("");
        setCardName("");
        setExpiry("");
        setCvv("");
        setStatus("idle");
        setErrorMessage("");
        onClose();
    }

    return (
        <>
            <button
                type="button"
                aria-label="Cerrar pago"
                className="fixed inset-0 z-[60] w-full bg-black/50 backdrop-blur-sm cursor-default"
                onClick={status === "loading" ? undefined : handleClose}
            />
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
                <div className="glass-modal rounded-2xl w-full max-w-sm pointer-events-auto animate-in fade-in zoom-in-95 duration-200">
                    {status === "success" ? (
                        <div className="px-8 py-10 text-center flex flex-col items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-cef-success/10 flex items-center justify-center">
                                <CheckCircle className="text-cef-success" size={32} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">¡Pago exitoso!</h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    Tu inscripción fue confirmada. Abonaste {formatPrice(monto)}.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleClose}
                                className="mt-2 px-6 py-2.5 rounded-lg bg-cef-primary text-white text-sm font-semibold hover:bg-cef-primary/90 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-200">
                                <div className="flex items-center gap-2">
                                    <CreditCard size={18} className="text-cef-primary" />
                                    <span className="text-sm font-semibold text-slate-800">Pago con tarjeta</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    disabled={status === "loading"}
                                    className="p-1.5 text-slate-400 rounded-lg hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Amount */}
                            <div className="px-6 pt-4 pb-2">
                                <p className="text-xs text-slate-400 mb-0.5">Total a pagar</p>
                                <p className="text-2xl font-bold text-cef-primary tracking-tight">
                                    {formatPrice(monto)}
                                </p>
                            </div>

                            {/* Form */}
                            <div className="px-6 pb-4 space-y-3.5">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                                        Número de tarjeta
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="0000 0000 0000 0000"
                                        value={cardNumber}
                                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                        maxLength={19}
                                        disabled={status === "loading"}
                                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-cef-primary/30 focus:border-cef-primary/50 disabled:opacity-50 disabled:bg-slate-50 font-mono tracking-widest"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                                        Nombre del titular
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Como aparece en la tarjeta"
                                        value={cardName}
                                        onChange={(e) => setCardName(e.target.value.toUpperCase())}
                                        disabled={status === "loading"}
                                        className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-cef-primary/30 focus:border-cef-primary/50 disabled:opacity-50 disabled:bg-slate-50 uppercase"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1.5">
                                            Vencimiento
                                        </label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="MM/AA"
                                            value={expiry}
                                            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                                            maxLength={5}
                                            disabled={status === "loading"}
                                            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-cef-primary/30 focus:border-cef-primary/50 disabled:opacity-50 disabled:bg-slate-50 font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1.5">
                                            CVV
                                        </label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="000"
                                            value={cvv}
                                            onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
                                            maxLength={3}
                                            disabled={status === "loading"}
                                            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-cef-primary/30 focus:border-cef-primary/50 disabled:opacity-50 disabled:bg-slate-50 font-mono"
                                        />
                                    </div>
                                </div>

                                {status === "error" && (
                                    <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 bg-cef-danger/10 border border-cef-danger/20">
                                        <AlertCircle size={15} className="text-cef-danger mt-0.5 flex-shrink-0" />
                                        <p className="text-xs text-cef-danger">{errorMessage}</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-6 pb-5 space-y-3">
                                <button
                                    type="button"
                                    onClick={handlePay}
                                    disabled={!isValid || status === "loading"}
                                    className="w-full py-3 rounded-lg bg-cef-primary text-white text-sm font-semibold hover:bg-cef-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {status === "loading" ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Procesando...
                                        </>
                                    ) : (
                                        <>
                                            <Lock size={14} />
                                            Pagar {formatPrice(monto)}
                                        </>
                                    )}
                                </button>
                                <p className="text-center text-[10px] text-slate-400 flex items-center justify-center gap-1">
                                    <Lock size={10} />
                                    Entorno de prueba — ningún cobro real se realizará
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
