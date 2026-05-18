"use client";

import { useActionState } from "react";
import { changePassword, ChangePasswordState } from "@/actions/profile";
import { Loader2, CheckCircle } from "lucide-react";

const inputCls =
    "w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 focus:border-cef-primary/60 focus:ring-2 focus:ring-cef-primary/15 outline-none transition-all text-sm";
const labelCls = "block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider";

export default function ChangePasswordForm() {
    const initialState: ChangePasswordState = {};
    const [state, formAction, isPending] = useActionState(changePassword, initialState);

    const errorMessage =
        state.error === "passwordMismatch" ? "Las contraseñas no coinciden" : state.error;

    return (
        <form action={formAction} className="space-y-4">
            {errorMessage && (
                <div className="bg-cef-danger/10 border border-cef-danger/20 text-cef-danger p-3 rounded-lg text-sm">
                    {errorMessage}
                </div>
            )}

            {state.success && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-lg text-sm flex items-center gap-2">
                    <CheckCircle size={15} />
                    Contraseña actualizada correctamente
                </div>
            )}

            <div>
                <label className={labelCls}>Contraseña actual</label>
                <input
                    name="current_password"
                    type="password"
                    required
                    autoComplete="current-password"
                    className={inputCls}
                />
            </div>

            <div>
                <label className={labelCls}>Nueva contraseña</label>
                <input
                    name="new_password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className={inputCls}
                />
            </div>

            <div>
                <label className={labelCls}>Confirmar contraseña</label>
                <input
                    name="confirm_password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className={inputCls}
                />
            </div>

            <div className="pt-2">
                <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-2 bg-cef-primary hover:bg-cef-primary/80 text-white rounded-lg disabled:opacity-60 flex items-center text-sm font-medium transition-colors"
                >
                    {isPending && <Loader2 className="animate-spin mr-2" size={15} />}
                    {isPending ? "Guardando..." : "Guardar"}
                </button>
            </div>
        </form>
    );
}
