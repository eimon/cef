import Link from "next/link";
import type { ReactNode } from "react";

const SERVER_API_URL =
    process.env.INTERNAL_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:8000";

type ConfirmEmailPageProps = {
    searchParams: Promise<{ token?: string }>;
};

export default async function ConfirmEmailPage({ searchParams }: ConfirmEmailPageProps) {
    const { token } = await searchParams;

    if (!token) {
        return <VerificationError message="El enlace de confirmación no es válido." />;
    }

    let detail = "";
    try {
        const res = await fetch(`${SERVER_API_URL}/auth/email/change/confirm`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
            cache: "no-store",
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            return <VerificationError message={data?.detail || "No pudimos confirmar el nuevo email."} />;
        }

        detail = data?.detail || "Tu email fue confirmado y actualizado correctamente.";
    } catch {
        return <VerificationError message="No pudimos confirmar tu nuevo email. Intentalo nuevamente." />;
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
            <div className="glass-modal w-full max-w-md rounded-2xl p-8 text-center">
                <h1 className="text-lg font-semibold text-slate-800">Email actualizado</h1>
                <p className="mt-3 text-sm text-slate-500">{detail}</p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Link
                        href="/profile"
                        className="rounded-lg bg-cef-primary px-4 py-2 text-sm font-semibold text-white hover:bg-cef-primary/90"
                    >
                        Ir al perfil
                    </Link>
                    <Link
                        href="/auth/login"
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    >
                        Volver al login
                    </Link>
                </div>
            </div>
        </main>
    );
}

function VerificationError({ message }: { message: string }) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
            <div className="glass-modal w-full max-w-md rounded-2xl p-8 text-center">
                <h1 className="text-lg font-semibold text-slate-800">No pudimos verificar el email</h1>
                <p className="mt-3 text-sm text-slate-500">{message}</p>
                <Link
                    href="/auth/login"
                    className="mt-6 inline-flex rounded-lg bg-cef-primary px-4 py-2 text-sm font-semibold text-white hover:bg-cef-primary/90"
                >
                    Volver al login
                </Link>
            </div>
        </main>
    );
}
