import AvisoMasivoView from "@/components/AvisoMasivoView";

export default function AvisoMasivoPage() {
    return (
        <main className="p-6">
            <div className="mb-6">
                <h1 className="text-xl font-semibold text-slate-800">Aviso Masivo</h1>
                <p className="text-sm text-slate-500 mt-1">
                    Redactá un mensaje y envialo por correo a todos los clientes activos de la plataforma
                </p>
            </div>
            <AvisoMasivoView />
        </main>
    );
}
