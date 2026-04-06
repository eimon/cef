"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { X, AlertCircle, CheckCircle } from "lucide-react";

type ToastType = "error" | "success";
type Toast = { id: string; message: string; type: ToastType };

type ToastContextType = {
    showError: (message: string) => void;
    showSuccess: (message: string) => void;
};

const ToastContext = createContext<ToastContextType>({
    showError: () => {},
    showSuccess: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const add = useCallback(
        (message: string, type: ToastType) => {
            const id = Math.random().toString(36).slice(2);
            setToasts((prev) => [...prev, { id, message, type }]);
            setTimeout(() => dismiss(id), 4000);
        },
        [dismiss]
    );

    const showError = useCallback((msg: string) => add(msg, "error"), [add]);
    const showSuccess = useCallback((msg: string) => add(msg, "success"), [add]);

    return (
        <ToastContext.Provider value={{ showError, showSuccess }}>
            {children}
            {toasts.length > 0 && (
                <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
                    {toasts.map((toast) => (
                        <div
                            key={toast.id}
                            className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm min-w-72 max-w-sm pointer-events-auto animate-in slide-in-from-bottom-2 duration-200 backdrop-blur-xl ${
                                toast.type === "error"
                                    ? "bg-cef-base/90 border-cef-danger/30 text-white/85"
                                    : "bg-cef-base/90 border-cef-success/30 text-white/85"
                            }`}
                        >
                            {toast.type === "error" ? (
                                <AlertCircle size={16} className="text-cef-danger mt-0.5 shrink-0" />
                            ) : (
                                <CheckCircle size={16} className="text-cef-success mt-0.5 shrink-0" />
                            )}
                            <span className="flex-1">{toast.message}</span>
                            <button
                                onClick={() => dismiss(toast.id)}
                                className="text-white/30 hover:text-white/60 transition-colors shrink-0"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </ToastContext.Provider>
    );
}

export const useToast = () => useContext(ToastContext);
