"use client";

import { useActionState, useEffect } from "react";
import { Pencil, Loader2 } from "lucide-react";
import { requestPasswordReset, type PasswordResetState } from "@/actions/auth";
import { useToast } from "@/context/ToastContext";

export default function ProfilePasswordResetButton({ email }: { email?: string | null }) {
    const initialState: PasswordResetState = {};
    const [state, formAction, isPending] = useActionState(requestPasswordReset, initialState);
    const { showSuccess, showError } = useToast();

    useEffect(() => {
        if (state?.success) showSuccess("Te enviamos un email con instrucciones para cambiar la contraseña.");
        if (state?.error) showError(state.error);
    }, [state?.success, state?.error, showSuccess, showError]);

    if (!email) {
        return (
            <button type="button" disabled title="Sin email" className="inline-flex items-center gap-2 w-full cursor-not-allowed justify-center rounded-lg border border-slate-300 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-500 transition-all sm:w-auto">
                <Pencil size={16} />
                Cambiar contraseña
            </button>
        );
    }

    return (
        <form action={formAction} className="w-full sm:w-auto">
            <input type="hidden" name="email" value={email} />
            <button type="submit" disabled={isPending} className="inline-flex items-center gap-2 w-full justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 sm:w-auto disabled:opacity-60">
                {isPending ? (<><Loader2 className="animate-spin" size={16} />Enviando...</>) : (<><Pencil size={16} />Cambiar contraseña</>)}
            </button>
        </form>
    );
}
