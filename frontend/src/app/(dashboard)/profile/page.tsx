import { serverApi } from "@/lib/server-api";
import { User, Mail, Shield, Calendar } from "lucide-react";
import ChangePasswordForm from "@/components/ChangePasswordForm";

interface UserProfile {
    id: string;
    email: string;
    telefono: string | null;
    nombre: string | null;
    apellido: string | null;
    role: string;
    created_at: string;
}

async function getProfile(): Promise<UserProfile | null> {
    try {
        const res = await serverApi("/auth/perfil");
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

export default async function ProfilePage() {
    const profile = await getProfile();

    return (
        <div className="space-y-6 max-w-2xl">
            <h1 className="text-2xl font-bold text-slate-800">Perfil</h1>

            <div className="glass rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
                    <div className="w-12 h-12 rounded-full bg-cef-primary/10 flex items-center justify-center">
                        <User size={22} className="text-cef-primary" />
                    </div>
                    <div>
                        <p className="text-slate-800 font-semibold text-lg">
                            {[profile?.nombre, profile?.apellido].filter(Boolean).join(" ") || "—"}
                        </p>
                        <p className="text-slate-400 text-sm">{profile?.email}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                        <Mail size={15} className="text-slate-300 shrink-0" />
                        <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wider">Email</p>
                            <p className="text-slate-700 text-sm">{profile?.email ?? "—"}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Shield size={15} className="text-slate-300 shrink-0" />
                        <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wider">Rol</p>
                            <p className="text-slate-700 text-sm capitalize">{profile?.role ?? "—"}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Calendar size={15} className="text-slate-300 shrink-0" />
                        <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wider">Miembro desde</p>
                            <p className="text-slate-700 text-sm">
                                {profile?.created_at
                                    ? new Date(profile.created_at).toLocaleDateString()
                                    : "—"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass rounded-2xl p-6 space-y-4">
                <h2 className="text-base font-semibold text-slate-700">Cambiar contraseña</h2>
                <ChangePasswordForm />
            </div>
        </div>
    );
}
