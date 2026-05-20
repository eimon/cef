import Link from "next/link";
import { redirect } from "next/navigation";

const SERVER_API_URL =
    process.env.INTERNAL_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:8000";

type VerifyEmailPageProps = {
    searchParams: Promise<{ token?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
    const { token } = await searchParams;

    if (!token) {
        return <VerificationError message="El enlace de verificacion no es valido." />;
    }

    let onboardingToken = "";
    try {
        const res = await fetch(`${SERVER_API_URL}/auth/verify-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
            cache: "no-store",
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.onboarding_token) {
            return <VerificationError message={data?.detail || "No pudimos confirmar tu email."} />;
        }
        onboardingToken = data.onboarding_token;
    } catch {
        return <VerificationError message="No pudimos confirmar tu email. Intentalo nuevamente." />;
    }

    redirect(`/auth/ficha-medica?token=${encodeURIComponent(onboardingToken)}`);
}

function VerificationError({ message }: { message: string }) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
            <div className="glass-modal w-full max-w-md rounded-2xl p-8 text-center">
                <h1 className="text-lg font-semibold text-slate-800">No pudimos verificar el email</h1>
                <p className="mt-2 text-sm text-slate-500">{message}</p>
                <Link
                    href="/auth/login"
                    className="mt-6 inline-flex rounded-lg bg-cef-primary px-4 py-2 text-sm font-semibold text-white hover:bg-cef-primary/80"
                >
                    Volver al login
                </Link>
            </div>
        </main>
    );
}
