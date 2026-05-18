"use client";

import { useSidebar } from "@/context/SidebarContext";
import { X, Home, Users, LogOut, UserCog, BookOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/actions/auth";

const navigation = [
    { name: "Clases", href: "/clases", icon: BookOpen, adminOnly: false },
    { name: "Usuarios", href: "/users", icon: UserCog, adminOnly: true },
];

export default function Sidebar({ userRole }: { userRole: string | null }) {
    const { isOpen, close } = useSidebar();
    const visibleNavigation = navigation.filter(item => !item.adminOnly || userRole === "admin");
    const pathname = usePathname();

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <button
                    type="button"
                    aria-label="Cerrar menú"
                    className="fixed inset-0 z-40 w-full bg-black/70 backdrop-blur-sm lg:hidden transition-opacity cursor-default"
                    onClick={close}
                />
            )}

            {/* Sidebar Panel */}
            <div
                className={`fixed inset-y-0 left-0 z-50 w-64 glass-sidebar shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto lg:flex lg:flex-col lg:border-r lg:shadow-none ${isOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                {/* Logo header */}
                <div className="flex items-center justify-between h-16 px-5 border-b border-white/[0.07]">
                    <span className="text-xl font-bold text-cef-primary tracking-tight">CEF</span>
                    <button
                        type="button"
                        className="ml-auto flex-shrink-0 p-1.5 text-white/40 rounded-md hover:text-white/70 hover:bg-white/[0.06] transition-colors lg:hidden"
                        onClick={close}
                    >
                        <span className="sr-only">Cerrar menú</span>
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <nav className="px-3 py-4 space-y-0.5">
                        {/* Dashboard / Home */}
                        <Link
                            href="/"
                            onClick={close}
                            className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${pathname === "/"
                                ? "bg-cef-primary/10 text-cef-primary"
                                : "text-white/50 hover:bg-white/[0.05] hover:text-white/80"
                                }`}
                        >
                            <Home
                                className={`mr-3 flex-shrink-0 h-5 w-5 transition-colors ${pathname === "/" ? "text-cef-primary" : "text-white/35 group-hover:text-white/60"}`}
                            />
                            Panel Principal
                        </Link>

                        {visibleNavigation.map((item) => {
                            const isActive = pathname.startsWith(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={close}
                                    className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${isActive
                                        ? "bg-cef-primary/10 text-cef-primary"
                                        : "text-white/50 hover:bg-white/[0.05] hover:text-white/80"
                                        }`}
                                >
                                    <item.icon
                                        className={`mr-3 flex-shrink-0 h-5 w-5 transition-colors ${isActive ? "text-cef-primary" : "text-white/35 group-hover:text-white/60"
                                            }`}
                                    />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="border-t border-white/[0.07] p-3">
                    <form action={logout}>
                        <button
                            type="submit"
                            className="group flex w-full items-center px-3 py-2.5 text-sm font-medium text-cef-danger/70 rounded-lg hover:bg-cef-danger/[0.08] hover:text-cef-danger transition-all"
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
