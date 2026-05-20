import PublicMedicalRecordForm from "@/components/PublicMedicalRecordForm";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

type FichaMedicaPageProps = {
    searchParams: Promise<{ token?: string }>;
};

export default async function FichaMedicaPage({ searchParams }: FichaMedicaPageProps) {
    const { token } = await searchParams;

    return (
        <main className="min-h-screen bg-cef-base">
            <header className="border-b border-slate-200 bg-white/95 backdrop-blur-xl">
                <div className="mx-auto flex h-16 w-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
                    <Link href="/auth/login" className="relative block h-9 w-44">
                        <Image
                            src="/Logo_horizontal.png"
                            alt="CEF"
                            fill
                            className="object-contain object-left"
                            priority
                        />
                    </Link>
                </div>
            </header>

            <div className="mx-auto w-full max-w-4xl px-4 py-8">
                <div className="mb-5 flex items-center justify-between gap-4">
                    <Link
                        href="/auth/login"
                        className="inline-flex items-center text-sm font-medium text-slate-500 transition-colors hover:text-cef-primary"
                    >
                        <ArrowLeft size={16} className="mr-2" />
                        Volver al login
                    </Link>
                    <span className="hidden rounded-full border border-cef-primary/20 bg-cef-primary/10 px-3 py-1 text-xs font-semibold text-cef-primary sm:inline-flex">
                        Registro de socio
                    </span>
                </div>
                <PublicMedicalRecordForm token={token || ""} />
            </div>
        </main>
    );
}
