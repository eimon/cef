"use client";

import { useActionState, FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, AlertCircle, Loader2, MailCheck } from "lucide-react";

import { signup, SignupState } from "@/actions/auth";

const initialState: SignupState = {};
const inputCls = "w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 focus:border-cef-primary/60 focus:ring-2 focus:ring-cef-primary/15 outline-none transition-all text-sm";
const labelCls = "block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider";

export default function RegisterPage() {
    const [state, formAction, isPending] = useActionState(signup, initialState);
    const values = state.values || {};
    const fieldErrors = state.fieldErrors || {};

    function handleBirthInput(e: FormEvent<HTMLInputElement>) {
        const el = e.currentTarget;
        let value = el.value.replace(/\D/g, "");
        if (value.length > 8) value = value.slice(0, 8);
        if (value.length > 4) value = value.slice(0, 2) + "/" + value.slice(2, 4) + "/" + value.slice(4);
        else if (value.length > 2) value = value.slice(0, 2) + "/" + value.slice(2);
        el.value = value;
    }

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
                        <form action={formAction} noValidate className="grid gap-4 p-6">
                            {fieldErrors._form && <p className="text-xs text-cef-danger">{fieldErrors._form}</p>}

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className={labelCls}>Nombre</label>
                                    <input name="nombre" required className={inputCls} defaultValue={values.nombre || ""} aria-invalid={Boolean(fieldErrors.nombre)} />
                                    {fieldErrors.nombre && <p className="mt-1.5 text-xs text-cef-danger">{fieldErrors.nombre}</p>}
                                </div>
                                <div>
                                    <label className={labelCls}>Apellido</label>
                                    <input name="apellido" required className={inputCls} defaultValue={values.apellido || ""} aria-invalid={Boolean(fieldErrors.apellido)} />
                                    {fieldErrors.apellido && <p className="mt-1.5 text-xs text-cef-danger">{fieldErrors.apellido}</p>}
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className={labelCls}>Email</label>
                                    <input name="email" type="email" required className={inputCls} defaultValue={values.email || ""} aria-invalid={Boolean(fieldErrors.email)} />
                                    {fieldErrors.email && <p className="mt-1.5 text-xs text-cef-danger">{fieldErrors.email}</p>}
                                </div>
                                <div>
                                    <label className={labelCls}>Telefono</label>
                                    <input name="telefono" type="tel" className={inputCls} defaultValue={values.telefono || ""} aria-invalid={Boolean(fieldErrors.telefono)} />
                                    {fieldErrors.telefono && <p className="mt-1.5 text-xs text-cef-danger">{fieldErrors.telefono}</p>}
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-3">
                                <div>
                                    <label className={labelCls}>DNI</label>
                                    <input name="dni" className={inputCls} defaultValue={values.dni || ""} aria-invalid={Boolean(fieldErrors.dni)} />
                                    {fieldErrors.dni && <p className="mt-1.5 text-xs text-cef-danger">{fieldErrors.dni}</p>}
                                </div>
                                <div>
                                    <label className={labelCls}>Fecha de nacimiento</label>
                                    <input
                                        name="fecha_nacimiento"
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={10}
                                        placeholder="DD/MM/AAAA"
                                        className={inputCls}
                                        defaultValue={values.fecha_nacimiento || ""}
                                        onInput={handleBirthInput}
                                        aria-invalid={Boolean(fieldErrors.fecha_nacimiento)}
                                    />
                                    {fieldErrors.fecha_nacimiento && (
                                        <p className="mt-1.5 text-xs text-cef-danger">{fieldErrors.fecha_nacimiento}</p>
                                    )}
                                </div>
                                <div>
                                    <label className={labelCls}>Genero</label>
                                    <select name="genero" required className={inputCls} defaultValue={values.genero || ""} aria-invalid={Boolean(fieldErrors.genero)}>
                                        <option value="" disabled>Seleccionar</option>
                                        <option value="femenino">Femenino</option>
                                        <option value="masculino">Masculino</option>
                                        <option value="no_binario">No binario</option>
                                        <option value="prefiero_no_decir">Prefiero no decir</option>
                                        <option value="otro">Otro</option>
                                    </select>
                                    {fieldErrors.genero && <p className="mt-1.5 text-xs text-cef-danger">{fieldErrors.genero}</p>}
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className={labelCls}>Contrasena</label>
                                    <input name="password" type="password" required className={inputCls} aria-invalid={Boolean(fieldErrors.password)} />
                                    {fieldErrors.password && <p className="mt-1.5 text-xs text-cef-danger">{fieldErrors.password}</p>}
                                    <p className="mt-1.5 text-xs text-slate-500">
                                        Debe tener como minimo 8 caracteres.
                                    </p>
                                </div>
                                <div>
                                    <label className={labelCls}>Confirmar contrasena</label>
                                    <input name="confirmPassword" type="password" required className={inputCls} aria-invalid={Boolean(fieldErrors.confirmPassword)} />
                                    {fieldErrors.confirmPassword && (
                                        <p className="mt-1.5 text-xs text-cef-danger">{fieldErrors.confirmPassword}</p>
                                    )}
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
