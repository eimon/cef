"use client";

import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";

import { signup, SignupState } from "@/actions/auth";

const initialState: SignupState = {};
const inputCls = "w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 focus:border-cef-primary/60 focus:ring-2 focus:ring-cef-primary/15 outline-none transition-all text-sm";
const labelCls = "block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider";

export default function RegisterPage() {
    const [state, formAction, isPending] = useActionState(signup, initialState);
    const values = state.values || {};

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-8">
            <div className="mx-auto w-full max-w-2xl">
                <Link
                    href="/auth/login"
                    className="mb-5 inline-flex items-center text-sm font-medium text-slate-500 hover:text-cef-primary"
                >
                    <ArrowLeft size={16} className="mr-2" />
                    Volver al login
                </Link>

                <div className="glass-modal rounded-2xl overflow-hidden">
                    <div className="border-b border-slate-200 px-6 py-5">
                        <div className="flex items-center gap-4">
                            <div className="relative h-16 w-24 shrink-0">
                                <Image src="/Logo.png" alt="CEF" fill className="object-contain" priority />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-800">Crear cuenta</h1>
                                <p className="mt-1 text-sm text-slate-500">
                                    Primero validamos tu email. La sesion se inicia al completar la ficha medica.
                                </p>
                            </div>
                        </div>
                    </div>

                    {state.success ? (
                        <div className="p-8 text-center">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-cef-success/10 text-cef-success">
                                <MailCheck size={24} />
                            </div>
                            <h2 className="text-lg font-semibold text-slate-800">Revisa tu email</h2>
                            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                                {state.message || "Te enviamos un enlace para confirmar tu cuenta."}
                            </p>
                        </div>
                    ) : (
                        <form action={formAction} className="grid gap-4 p-6">
                            {state.error && (
                                <div className="rounded-lg border border-cef-danger/20 bg-cef-danger/10 p-3 text-sm text-cef-danger">
                                    {state.error}
                                </div>
                            )}

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className={labelCls}>Nombre</label>
                                    <input name="nombre" required className={inputCls} defaultValue={values.nombre || ""} />
                                </div>
                                <div>
                                    <label className={labelCls}>Apellido</label>
                                    <input name="apellido" required className={inputCls} defaultValue={values.apellido || ""} />
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className={labelCls}>Email</label>
                                    <input name="email" type="email" required className={inputCls} defaultValue={values.email || ""} />
                                </div>
                                <div>
                                    <label className={labelCls}>Telefono</label>
                                    <input name="telefono" type="tel" className={inputCls} defaultValue={values.telefono || ""} />
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-3">
                                <div>
                                    <label className={labelCls}>DNI</label>
                                    <input name="dni" className={inputCls} defaultValue={values.dni || ""} />
                                </div>
                                <div>
                                    <label className={labelCls}>Fecha de nacimiento</label>
                                    <input
                                        name="fecha_nacimiento"
                                        type="date"
                                        className={inputCls}
                                        defaultValue={values.fecha_nacimiento || ""}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Genero</label>
                                    <select name="genero" required className={inputCls} defaultValue={values.genero || ""}>
                                        <option value="" disabled>Seleccionar</option>
                                        <option value="femenino">Femenino</option>
                                        <option value="masculino">Masculino</option>
                                        <option value="no_binario">No binario</option>
                                        <option value="prefiero_no_decir">Prefiero no decir</option>
                                        <option value="otro">Otro</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className={labelCls}>Contrasena</label>
                                    <input name="password" type="password" required className={inputCls} />
                                    <p className="mt-1.5 text-xs text-slate-500">
                                        Debe tener como minimo 8 caracteres.
                                    </p>
                                </div>
                                <div>
                                    <label className={labelCls}>Confirmar contrasena</label>
                                    <input name="confirmPassword" type="password" required className={inputCls} />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isPending}
                                className="mt-2 inline-flex items-center justify-center rounded-lg bg-cef-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cef-primary/80 disabled:opacity-60"
                            >
                                {isPending ? <Loader2 className="mr-2 animate-spin" size={16} /> : null}
                                Crear cuenta
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </main>
    );
}
