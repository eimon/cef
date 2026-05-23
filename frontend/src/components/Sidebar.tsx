"use client";

import { useSidebar } from "@/context/SidebarContext";
import { X, Home, LogOut, UserCog, BookOpen, CalendarCheck, GraduationCap, UserRound, DollarSign } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/actions/auth";

const navigation = [
    { name: "Clases", href: "/clases", icon: BookOpen, adminOnly: false, clientOnly: false, staffOnly: false },
    { name: "Mis Clases", href: "/mis-clases", icon: CalendarCheck, adminOnly: false, clientOnly: true, staffOnly: false },
    { name: "Perfil", href: "/profile", icon: UserRound, adminOnly: false, clientOnly: false, staffOnly: false },
    { name: "Usuarios", href: "/users", icon: UserCog, adminOnly: true, clientOnly: false, staffOnly: false },
    { name: "Profesores", href: "/profesores", icon: GraduationCap, adminOnly: false, clientOnly: false, staffOnly: true },
    { name: "Precios", href: "/precios", icon: DollarSign, adminOnly: true, clientOnly: false, staffOnly: false },
];

export default function Sidebar({ userRole }: { userRole: string | null }) {
    const { isOpen, close } = useSidebar();
    const visibleNavigation = navigation.filter(item =>
        (!item.adminOnly || userRole === "admin") &&
        (!item.clientOnly || userRole === "cliente") &&
        (!item.staffOnly || userRole === "admin" || userRole === "recepcion")
    );
    const pathname = usePathname();

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <button
                    type="button"
                    aria-label="Cerrar menú"
                    className="fixed inset-0 z-40 w-full bg-black/50 backdrop-blur-sm lg:hidden transition-opacity cursor-default"
                    onClick={close}
                />
            )}

            {/* Sidebar Panel */}
            <div
                className={`fixed inset-y-0 left-0 z-50 w-64 glass-sidebar shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto lg:flex lg:flex-col lg:border-r lg:shadow-none ${isOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                {/* Header — height matches navbar (h-16) with close button on mobile */}
                <div className="flex items-center justify-end h-16 px-5 border-b border-slate-200">
                    <button
                        type="button"
                        className="flex-shrink-0 p-1.5 text-slate-400 rounded-md hover:text-slate-600 hover:bg-slate-100 transition-colors lg:hidden"
                        onClick={close}
                    >
                        <span className="sr-only">Cerrar menú</span>
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <nav className="px-3 py-4 space-y-0.5">
                        {/* Dashboard / Home — solo para admin y recepción */}
                        {userRole !== "cliente" && (
                        <Link
                            href="/"
                            onClick={close}
                            className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${pathname === "/"
                                ? "bg-cef-primary/10 text-cef-primary"
                                : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                }`}
                        >
                            <Home
                                className={`mr-3 flex-shrink-0 h-5 w-5 transition-colors ${pathname === "/" ? "text-cef-primary" : "text-slate-400 group-hover:text-slate-600"}`}
                            />
                            Panel Principal
                        </Link>
                        )}

                        {visibleNavigation.map((item) => {
                            const isActive = pathname.startsWith(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={close}
                                    className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${isActive
                                        ? "bg-cef-primary/10 text-cef-primary"
                                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                        }`}
                                >
                                    <item.icon
                                        className={`mr-3 flex-shrink-0 h-5 w-5 transition-colors ${isActive ? "text-cef-primary" : "text-slate-400 group-hover:text-slate-600"
                                            }`}
                                    />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="border-t border-slate-200 p-3">
                    <form action={logout}>
                        <button
                            type="submit"
                            className="group flex w-full items-center px-3 py-2.5 text-sm font-medium text-cef-danger/70 rounded-lg hover:bg-cef-danger/5 hover:text-cef-danger transition-all"
                        >
                            <LogOut className="mr-3 flex-shrink-0 h-5 w-5" />
                            Cerrar Sesión
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}
