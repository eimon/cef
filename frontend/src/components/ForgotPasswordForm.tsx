"use client";

import { useActionState, useEffect, useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import { requestPasswordReset, type PasswordResetState } from "@/actions/auth";
import { useToast } from "@/context/ToastContext";
import { isValidEmail } from "@/lib/validation";

const inputCls = "w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-cef-primary/60 focus:bg-white focus:ring-2 focus:ring-cef-primary/15";
const labelCls = "block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider";

export default function ForgotPasswordForm() {
    const initialState: PasswordResetState = {};
    const [state, formAction, isPending] = useActionState(requestPasswordReset, initialState);
    const [email, setEmail] = useState("");
    const { showSuccess } = useToast();
    const canSubmit = isValidEmail(email);

    useEffect(() => {
        if (state?.success) showSuccess("Te enviamos un email con instrucciones para cambiar la contraseña.");
    }, [state?.success, showSuccess]);

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cef-primary/10 text-cef-primary">
                    <Mail size={18} />
                </div>
                <div>
                    <h3 className="text-base font-semibold text-slate-800">Olvidé mi contraseña</h3>
                    <p className="text-sm text-slate-500">Ingresá tu email y te enviaremos un enlace para cambiar la contraseña.</p>
                </div>
            </div>

            <form action={formAction} className="space-y-4" noValidate>
                {state?.error && (
                    <div className="rounded-xl bg-cef-danger/10 border border-cef-danger/20 p-3 text-sm text-cef-danger">
                        {state.error}
                    </div>
                )}

                <div>
                    <label className={labelCls} htmlFor="email">Email</label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className={inputCls}
                        placeholder="tu@correo.com"
                        aria-invalid={state?.fieldErrors?.email ? "true" : undefined}
                    />
                    {state?.fieldErrors?.email ? (
                        <p className="mt-1.5 text-xs text-cef-danger">{state.fieldErrors.email}</p>
                    ) : null}
                </div>

                <button type="submit" disabled={isPending || !canSubmit} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cef-primary px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-cef-primary/90 disabled:opacity-60">
                    {isPending ? (<><Loader2 className="animate-spin" size={16} />Enviando...</>) : ("Enviar enlace")}
                </button>
            </form>
        </div>
    );
}
