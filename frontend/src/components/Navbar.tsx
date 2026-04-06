import SidebarTrigger from "@/components/SidebarTrigger";
import { serverApi } from "@/lib/server-api";
import { User } from "@/types/api";
import { User as UserIcon, LogOut, ChevronDown } from "lucide-react";
import { logout } from "@/actions/auth";
import Link from "next/link";

export default async function Navbar() {
    let user: User | null = null;

    try {
        const res = await serverApi("/auth/perfil");
        if (res.ok) {
            user = await res.json();
        }
    } catch (error) {
        console.error("Failed to fetch user profile:", error);
    }

    return (
        <nav className="bg-[#06090f]/80 backdrop-blur-2xl border-b border-white/[0.08] sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">

                    {/* Left: Hamburger & Logo */}
                    <div className="flex items-center">
                        <SidebarTrigger />
                        <div className="flex-shrink-0 flex items-center ml-4 lg:ml-0">
                            <Link href="/" className="text-xl font-bold text-cef-primary tracking-tight">
                                CEF
                            </Link>
                        </div>
                    </div>

                    {/* Right: User Profile & Actions */}
                    <div className="flex items-center space-x-4">

                        {user ? (
                            <div className="relative flex items-center space-x-3">
                                <div className="hidden md:flex flex-col items-end">
                                    <span className="text-sm font-medium text-white/85">{user.full_name}</span>
                                    <span className="text-xs text-white/40 capitalize">{user.role.toLowerCase()}</span>
                                </div>

                                <div className="relative group">
                                    <button className="flex items-center space-x-2 p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] transition-colors">
                                        <div className="h-8 w-8 rounded-lg bg-cef-primary/15 flex items-center justify-center text-cef-primary">
                                            <UserIcon size={16} />
                                        </div>
                                        <ChevronDown size={13} className="text-white/40" />
                                    </button>

                                    <div className="absolute right-0 mt-2 w-48 glass-modal rounded-xl shadow-2xl py-1 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-200 origin-top-right">
                                        <div className="px-4 py-3 border-b border-white/[0.08] md:hidden">
                                            <p className="text-sm font-medium text-white/85">{user.full_name}</p>
                                            <p className="text-xs text-white/40">{user.email}</p>
                                        </div>

                                        <Link
                                            href="/profile"
                                            className="block px-4 py-2 text-sm text-white/65 hover:bg-white/[0.06] hover:text-white/90 transition-colors"
                                        >
                                            Mi Perfil
                                        </Link>

                                        <form action={logout} className="w-full">
                                            <button
                                                type="submit"
                                                className="w-full text-left px-4 py-2 text-sm text-cef-danger/75 hover:bg-cef-danger/[0.08] hover:text-cef-danger flex items-center transition-colors"
                                            >
                                                <LogOut size={14} className="mr-2" />
                                                Cerrar Sesión
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-white/40">Iniciar Sesión</div>
                        )}
                    </div>

                </div>
            </div>
        </nav>
    );
}
