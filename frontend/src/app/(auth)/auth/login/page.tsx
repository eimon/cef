"use client";

import { useActionState, useState } from "react";
import { login, LoginState } from "@/actions/auth";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { isValidEmail } from "@/lib/validation";

export default function LoginPage() {
    const initialState: LoginState = { error: "", success: false };
    const [state, formAction, isPending] = useActionState(login, initialState);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const canSubmit = isValidEmail(email) && password.trim().length > 0;

    return (
        <div className="flex items-center justify-center min-h-screen p-4 bg-slate-50">
            <div className="w-full max-w-md glass-modal rounded-2xl overflow-hidden">
                <div className="p-8">
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-5">
                            <div className="relative h-40 w-64">
                                <Image
                                    src="/Logo.png"
                                    alt="CEF"
                                    fill
                                    className="object-contain"
                                    priority
                                />
                            </div>
                        </div>
                    </div>

                    <form action={formAction} className="space-y-5">
                        {state?.error && (
                            <div className="bg-cef-danger/10 border border-cef-danger/20 text-cef-danger p-3 rounded-lg text-sm text-center">
                                {state.error}
                            </div>
                        )}

                        <div>
                            <label
                                htmlFor="email"
                                className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider"
                            >
                                Email
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 focus:border-cef-primary/60 focus:ring-2 focus:ring-cef-primary/15 outline-none transition-all text-sm"
                                placeholder="correo@ejemplo.com"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider"
                            >
                                Contraseña
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 focus:border-cef-primary/60 focus:ring-2 focus:ring-cef-primary/15 outline-none transition-all text-sm"
                                placeholder="********"
                            />
                            <div className="mt-2 text-right">
                                <Link href="/auth/forgot-password" className="text-xs text-cef-primary hover:text-cef-primary/80 font-medium">
                                    Olvidé mi contraseña
                                </Link>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isPending || !canSubmit}
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

                <div className="bg-slate-50 border-t border-slate-200 px-8 py-4 text-center">
                    <p className="text-xs text-slate-400">
                        No tenes cuenta?{" "}
                        <Link href="/auth/register" className="text-cef-primary font-medium hover:text-cef-primary/80">
                            Registrate
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
