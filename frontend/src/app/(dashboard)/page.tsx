import { serverApi } from "@/lib/server-api";
import { User } from "@/types/api";
import { Users, LayoutDashboard, BookOpen } from "lucide-react";
import Link from "next/link";

export default async function DashboardHome() {
    const user: User | null = await serverApi("/auth/perfil").then(r => r.ok ? r.json() : null).catch(() => null);

    const firstName = user?.nombre || "";
    const now = new Date();
    const monthName = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(now);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

            {/* Welcome header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white/90">
                        {firstName ? `¡Hola de nuevo, ${firstName}!` : "Bienvenido"}
                    </h1>
                    <p className="text-white/40 mt-1 text-sm capitalize">Resumen del mes de {monthName}</p>
                </div>
                {user && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-cef-primary/10 text-cef-primary border border-cef-primary/20 capitalize self-start sm:self-auto">
                        {user.role}
                    </span>
                )}
            </div>

            {/* Simple Dashboard Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link href="/users" className="glass rounded-2xl p-6 hover:bg-white/[0.07] transition-all group border border-white/[0.05]">
                    <div className="w-12 h-12 rounded-xl bg-cef-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Users className="text-cef-primary" size={24} />
                    </div>
                    <h3 className="text-lg font-semibold text-white/90">Gestión de Usuarios</h3>
                    <p className="text-sm text-white/40 mt-2">Administra los usuarios del sistema, sus roles y accesos.</p>
                </Link>

                <Link href="/clases" className="glass rounded-2xl p-6 hover:bg-white/[0.07] transition-all group border border-white/[0.05]">
                    <div className="w-12 h-12 rounded-xl bg-cef-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <BookOpen className="text-cef-primary" size={24} />
                    </div>
                    <h3 className="text-lg font-semibold text-white/90">Clases del Gimnasio</h3>
                    <p className="text-sm text-white/40 mt-2">Consultá horarios, cupos y detalles de cada clase.</p>
                </Link>
            </div>

        </div>
    );
}
