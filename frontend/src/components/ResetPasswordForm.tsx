"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, Key, CheckCircle } from "lucide-react";
import { resetPassword, type PasswordResetState } from "@/actions/auth";
import { useToast } from "@/context/ToastContext";
import Link from "next/link";

const inputCls = "w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-cef-primary/60 focus:bg-white focus:ring-2 focus:ring-cef-primary/15";
const labelCls = "block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider";

export default function ResetPasswordForm({ token }: { token: string }) {
    const initialState: PasswordResetState = {};
    const [state, formAction, isPending] = useActionState(resetPassword, initialState);
    const { showSuccess } = useToast();
    const [showSuccessScreen, setShowSuccessScreen] = useState(false);

    useEffect(() => {
        if (state?.success) {
            showSuccess("Contraseña actualizada correctamente.");
            setShowSuccessScreen(true);
        }
    }, [state?.success, showSuccess]);

    if (showSuccessScreen) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-center">
                <div className="mb-4 flex justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                        <CheckCircle size={28} />
                    </div>
                </div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">¡Contraseña actualizada!</h3>
                <p className="text-sm text-slate-500 mb-6">Tu contraseña ha sido cambiada exitosamente. Ya podes ingresar con tu nueva contraseña.</p>
                <Link href="/auth/login" className="inline-flex items-center justify-center rounded-lg bg-cef-primary px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-cef-primary/90">
                    Ir a ingresar
                </Link>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cef-primary/10 text-cef-primary">
                    <Key size={18} />
                </div>
                <div>
                    <h3 className="text-base font-semibold text-slate-800">Cambiar contraseña</h3>
                    <p className="text-sm text-slate-500">Ingresá la nueva contraseña.</p>
                </div>
            </div>

            <form action={formAction} className="space-y-4" noValidate>
                {state?.error && (
                    <div className="rounded-xl bg-cef-danger/10 border border-cef-danger/20 p-3 text-sm text-cef-danger">
                        {state.error}
                    </div>
                )}

                <input type="hidden" name="token" value={token} />

                <div>
                    <label className={labelCls} htmlFor="new_password">Nueva contraseña</label>
                    <input id="new_password" name="new_password" type="password" required className={inputCls} aria-invalid={state?.fieldErrors?.new_password ? "true" : undefined} />
                </div>

                <div>
                    <label className={labelCls} htmlFor="confirm_password">Confirmar contraseña</label>
                    <input id="confirm_password" name="confirm_password" type="password" required className={inputCls} />
                </div>

                <button type="submit" disabled={isPending} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cef-primary px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-cef-primary/90 disabled:opacity-60">
                    {isPending ? (<><Loader2 className="animate-spin" size={16} />Cambiando...</>) : ("Cambiar contraseña")}
                </button>
            </form>
        </div>
    );
}
