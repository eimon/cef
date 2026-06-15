import { QrCode } from "lucide-react";
import { getMe } from "@/actions/users";
import Image from "next/image";

export default async function MiQrPage() {
    const user = await getMe();

    if (!user?.dni) {
        return (
            <main className="p-6 flex justify-center">
                <div className="glass rounded-2xl p-8 text-center max-w-sm w-full">
                    <p className="text-slate-500 text-sm">
                        No tenés un DNI registrado. Contactá al staff para configurarlo.
                    </p>
                </div>
            </main>
        );
    }

    const nombre = `${user.nombre ?? ""} ${user.apellido ?? ""}`.trim() || user.email;
    const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(user.dni)}&size=220&dark=1e293b&light=ffffff&margin=2`;

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
            <div className="w-full max-w-sm">
                <div className="mb-6 text-center">
                    <h1 className="text-xl font-semibold text-slate-800">Mi QR de Asistencia</h1>
                    <p className="text-sm text-slate-500 mt-1">Mostrá este código al ingresar a tu clase</p>
                </div>

                <div className="glass rounded-2xl p-6 flex flex-col items-center gap-5">
                    <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                        <QrCode size={13} />
                        <span>Código de acceso</span>
                    </div>

                    <div className="bg-white p-3 rounded-xl shadow-sm">
                        <Image
                            src={qrUrl}
                            alt={`QR de ${nombre}`}
                            width={220}
                            height={220}
                            unoptimized
                        />
                    </div>

                    <div className="text-center">
                        <p className="text-sm font-semibold text-slate-700">{nombre}</p>
                        <p className="text-xs text-slate-400 mt-0.5">DNI: {user.dni}</p>
                    </div>
                </div>

                <p className="text-xs text-slate-400 text-center mt-4 px-2">
                    Este código está vinculado a tu DNI y te identifica como cliente del gimnasio.
                </p>
            </div>
        </div>
    );
}
