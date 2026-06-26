"use client";

import { useState, useEffect } from "react";
import { useSidebar } from "@/context/SidebarContext";
import { X, Home, LogOut, UserCog, BookOpen, CalendarCheck, GraduationCap, UserRound, DollarSign, ChevronDown, Building2, Layers, ReceiptText, QrCode, UserCheck, Megaphone, BarChart3, FlaskConical } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/actions/auth";
import { getMisWaitlist } from "@/actions/inscripciones";
import { EstadoWaitlist } from "@/types/api";
import type { LucideIcon } from "lucide-react";

const PENDING_WAITLIST_POLL_MS = 60_000;

type NavChild = { name: string; href: string; adminOnly?: boolean };

type NavItem = {
    name: string;
    href?: string;
    icon: LucideIcon;
    adminOnly: boolean;
    clientOnly: boolean;
    staffOnly: boolean;
    children?: NavChild[];
};

const navigation: NavItem[] = [
    { name: "Clases",     href: "/clases",     icon: BookOpen,   adminOnly: false, clientOnly: false, staffOnly: false },
    { name: "Mis Clases", href: "/mis-clases", icon: CalendarCheck, adminOnly: false, clientOnly: true, staffOnly: false },
    { name: "Mis Pagos",  href: "/mis-pagos",  icon: ReceiptText, adminOnly: false, clientOnly: true, staffOnly: false },
    { name: "Mi QR",     href: "/mi-qr",      icon: QrCode,     adminOnly: false, clientOnly: true, staffOnly: false },
    { name: "Perfil",     href: "/profile",    icon: UserRound,  adminOnly: false, clientOnly: false, staffOnly: false },
    {
        name: "Usuarios",
        icon: UserCog,
        adminOnly: false,
        clientOnly: false,
        staffOnly: true,
        children: [
            { name: "Personal", href: "/users/personal", adminOnly: true },
            { name: "Clientes", href: "/users/clientes" },
        ],
    },
    { name: "Profesores",  href: "/profesores",  icon: GraduationCap, adminOnly: false, clientOnly: false, staffOnly: true },
    { name: "Asistencias", href: "/asistencias", icon: UserCheck,     adminOnly: false, clientOnly: false, staffOnly: true },
    { name: "Salas",         href: "/salas",          icon: Building2,  adminOnly: true, clientOnly: false, staffOnly: false },
    { name: "Disciplinas",   href: "/disciplinas",    icon: Layers,     adminOnly: true, clientOnly: false, staffOnly: false },
    { name: "Precios",       href: "/precios",        icon: DollarSign, adminOnly: true, clientOnly: false, staffOnly: false },
    { name: "Aviso Masivo",  href: "/aviso-masivo",   icon: Megaphone,  adminOnly: true, clientOnly: false, staffOnly: false },
    { name: "Reportes",       href: "/reportes",       icon: BarChart3,     adminOnly: true, clientOnly: false, staffOnly: false },
    { name: "Simulaciones",   href: "/simulaciones",   icon: FlaskConical,  adminOnly: true, clientOnly: false, staffOnly: false },
];

function getActiveGroup(pathname: string) {
    return navigation.find((item) => item.children?.some((child) => pathname.startsWith(child.href)))?.name ?? null;
}

export default function Sidebar({ userRole }: { userRole: string | null }) {
    const { isOpen, close } = useSidebar();
    const pathname = usePathname();
    const [openGroup, setOpenGroup] = useState<string | null>(() => getActiveGroup(pathname));
    const [hasPendingWaitlist, setHasPendingWaitlist] = useState(false);

    useEffect(() => {
        const activeGroup = getActiveGroup(pathname);
        if (!activeGroup) return;
        const timeoutId = window.setTimeout(() => setOpenGroup(activeGroup), 0);
        return () => window.clearTimeout(timeoutId);
    }, [pathname]);

    useEffect(() => {
        if (userRole !== "cliente") return;

        let cancelled = false;
        async function checkPendingWaitlist() {
            const entries = await getMisWaitlist();
            if (!cancelled) {
                setHasPendingWaitlist(entries.some((entry) => entry.estado === EstadoWaitlist.NOTIFICADO));
            }
        }

        checkPendingWaitlist();
        const intervalId = window.setInterval(checkPendingWaitlist, PENDING_WAITLIST_POLL_MS);
        return () => {
            cancelled = true;
            window.clearInterval(intervalId);
        };
    }, [userRole]);

    const visibleNavigation = navigation.filter(item =>
        (!item.adminOnly || userRole === "admin") &&
        (!item.clientOnly || userRole === "cliente") &&
        (!item.staffOnly || userRole === "admin" || userRole === "recepcion")
    );

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
                className={`fixed inset-y-0 left-0 z-50 w-64 glass-sidebar shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto lg:flex lg:flex-col lg:border-r lg:shadow-none ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
            >
                {/* Header */}
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
                        {userRole !== "cliente" && (
                            <Link
                                href="/"
                                onClick={close}
                                className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${pathname === "/"
                                    ? "bg-cef-primary/10 text-cef-primary"
                                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                }`}
                            >
                                <Home className={`mr-3 flex-shrink-0 h-5 w-5 transition-colors ${pathname === "/" ? "text-cef-primary" : "text-slate-400 group-hover:text-slate-600"}`} />
                                Panel Principal
                            </Link>
                        )}

                        {visibleNavigation.map((item) => {
                            if (item.children) {
                                // If the current user is a recepcionista, make the group act as a direct link
                                if (userRole === "recepcion") {
                                    const firstVisibleChild = item.children.find(c => !c.adminOnly);
                                    const targetHref = firstVisibleChild?.href ?? item.children[0].href;
                                    const isActive = item.children.some(c => pathname.startsWith(c.href));
                                    return (
                                        <Link
                                            key={item.name}
                                            href={targetHref!}
                                            onClick={close}
                                            className={`group w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${isActive
                                                ? "bg-cef-primary/10 text-cef-primary"
                                                : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                            }`}
                                        >
                                            <item.icon className={`mr-3 flex-shrink-0 h-5 w-5 transition-colors ${isActive ? "text-cef-primary" : "text-slate-400 group-hover:text-slate-600"}`} />
                                            {item.name}
                                        </Link>
                                    );
                                }
                                const isGroupActive = item.children.some(c => pathname.startsWith(c.href));
                                const isGroupOpen = openGroup === item.name;
                                return (
                                    <div key={item.name}>
                                        <button
                                            type="button"
                                            onClick={() => setOpenGroup(isGroupOpen ? null : item.name)}
                                            className={`group w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${isGroupActive
                                                ? "bg-cef-primary/10 text-cef-primary"
                                                : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                            }`}
                                        >
                                            <item.icon className={`mr-3 flex-shrink-0 h-5 w-5 transition-colors ${isGroupActive ? "text-cef-primary" : "text-slate-400 group-hover:text-slate-600"}`} />
                                            {item.name}
                                            <ChevronDown className={`ml-auto h-4 w-4 transition-transform duration-200 ${isGroupOpen ? "rotate-180" : ""}`} />
                                        </button>
                                        {isGroupOpen && (
                                            <div className="mt-0.5 ml-9 space-y-0.5">
                                                {item.children
                                                    .filter(child => !child.adminOnly || userRole === "admin")
                                                    .map((child) => {
                                                    const isChildActive = pathname.startsWith(child.href);
                                                    return (
                                                        <Link
                                                            key={child.href}
                                                            href={child.href}
                                                            onClick={close}
                                                            className={`block px-3 py-2 text-sm font-medium rounded-lg transition-all ${isChildActive
                                                                ? "bg-cef-primary/10 text-cef-primary"
                                                                : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                                            }`}
                                                        >
                                                            {child.name}
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            const isActive = pathname.startsWith(item.href!);
                            const showPendingBadge = item.href === "/mis-clases" && hasPendingWaitlist && !isActive;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href!}
                                    onClick={close}
                                    className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${isActive
                                        ? "bg-cef-primary/10 text-cef-primary"
                                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                    }`}
                                >
                                    <span className="relative mr-3 flex-shrink-0">
                                        <item.icon className={`h-5 w-5 transition-colors ${isActive ? "text-cef-primary" : "text-slate-400 group-hover:text-slate-600"}`} />
                                        {showPendingBadge && (
                                            <span
                                                className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-cef-danger"
                                                title="Tenés un cupo liberado pendiente de confirmar"
                                            />
                                        )}
                                    </span>
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
