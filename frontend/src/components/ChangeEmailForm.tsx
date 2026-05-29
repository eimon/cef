"use client";

import { useActionState, useEffect, useState } from "react";
import { useToast } from "@/context/ToastContext";
import { Loader2, Mail, Pencil } from "lucide-react";

import { requestEmailChange } from "@/actions/profile";

const inputCls = "w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-cef-primary/60 focus:bg-white focus:ring-2 focus:ring-cef-primary/15";
const labelCls = "block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider";

export default function ChangeEmailForm({ currentEmail }: { currentEmail?: string | null }) {
    const [showForm, setShowForm] = useState(false);
    const [newEmail, setNewEmail] = useState("");
    const [state, formAction, isPending] = useActionState(requestEmailChange, { success: false, values: { new_email: "" } });
    const values = state.values || { new_email: "" };
    const fieldErrors = state.fieldErrors || {};
    const newEmailError = fieldErrors.new_email || fieldErrors._form;
    const { showSuccess } = useToast();
    const canSubmit = newEmail.trim().length > 0;

    useEffect(() => {
        if (state?.success) {
            showSuccess("Te enviamos un email de confirmación al nuevo correo.");
        }
    }, [state?.success, showSuccess]);

    useEffect(() => {
        setNewEmail(values.new_email || "");
    }, [values.new_email]);

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cef-primary/10 text-cef-primary">
                    <Mail size={18} />
                </div>
                <div>
                    <h3 className="text-base font-semibold text-slate-800">Email</h3>
                </div>
            </div>

            {!showForm ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Email actual</p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">{currentEmail || "No informado"}</p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowForm(true)}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-cef-primary hover:text-cef-primary"
                        >
                            <Pencil size={16} />
                            Cambiar email
                        </button>
                    </div>
                </div>
            ) : (
                <form action={formAction} noValidate className="space-y-4">
                    <div>
                        <label className={labelCls}>Email actual</label>
                        <input className={inputCls + " bg-slate-100 text-slate-500"} value={currentEmail || ""} disabled />
                    </div>

                    <div>
                        <label className={labelCls} htmlFor="new_email">
                            Nuevo email
                        </label>
                        <input
                            id="new_email"
                            name="new_email"
                            type="email"
                            required
                            value={newEmail}
                            onChange={(event) => setNewEmail(event.target.value)}
                            className={inputCls}
                            placeholder="nuevo@correo.com"
                            aria-invalid={Boolean(newEmailError)}
                        />
                        {newEmailError && <p className="mt-1.5 text-xs text-cef-danger">{newEmailError}</p>}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <button
                            type="submit"
                            disabled={isPending || !canSubmit}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cef-primary px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-cef-primary/90 disabled:opacity-60 sm:w-auto"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="animate-spin" size={16} />
                                    Enviando...
                                </>
                            ) : (
                                "Solicitar cambio"
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-cef-primary hover:text-cef-primary sm:w-auto"
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
