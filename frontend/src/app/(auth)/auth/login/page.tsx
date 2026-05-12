"use client";

import { useActionState } from "react";
import { login, LoginState } from "@/actions/auth";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
    const initialState: LoginState = { error: "", success: false };
    const [state, formAction, isPending] = useActionState(login, initialState);

    return (
        <div className="flex items-center justify-center min-h-screen p-4">
            <div className="w-full max-w-md glass-modal rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-8">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-cef-primary/15 text-cef-primary mb-4">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-white/90 mb-1 tracking-tight">CEF</h1>
                        <p className="text-white/45 text-sm">Ingresá con tu cuenta</p>
                    </div>

                    <form action={formAction} className="space-y-5">
                        {state?.error && (
                            <div className="bg-cef-danger/10 border border-cef-danger/20 text-cef-danger/90 p-3 rounded-lg text-sm text-center">
                                {state.error}
                            </div>
                        )}

                        <div>
                            <label
                                htmlFor="email"
                                className="block text-xs font-medium text-white/55 mb-1.5 uppercase tracking-wider"
                            >
                                Email
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="w-full px-4 py-2.5 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white/90 focus:border-cef-primary/60 focus:ring-2 focus:ring-cef-primary/15 outline-none transition-all text-sm"
                                placeholder="correo@ejemplo.com"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-xs font-medium text-white/55 mb-1.5 uppercase tracking-wider"
                            >
                                Contraseña
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="w-full px-4 py-2.5 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white/90 focus:border-cef-primary/60 focus:ring-2 focus:ring-cef-primary/15 outline-none transition-all text-sm"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isPending}
                            className="w-full bg-cef-primary hover:bg-cef-primary/80 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center text-sm mt-2"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="animate-spin mr-2" size={16} />
                                    Ingresando...
                                </>
                            ) : (
                                "Ingresar"
                            )}
                        </button>
                    </form>
                </div>

                <div className="bg-white/[0.02] border-t border-white/[0.06] px-8 py-4 text-center">
                    <p className="text-xs text-white/35">
                        ¿No tenés cuenta?{" "}
                        <span className="text-cef-primary/80 font-medium">
                            Contactá al administrador
                        </span>
                    </p>
                </div>
            </div>
        </div>
    );
}
