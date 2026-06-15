import AsistenciasTabView from "@/components/AsistenciasTabView";

export default function AsistenciasPage() {
    return (
        <main className="p-6">
            <div className="mb-6">
                <h1 className="text-xl font-semibold text-slate-800">Marcar Asistencia</h1>
                <p className="text-sm text-slate-500 mt-1">
                    Registrá la asistencia ingresando el DNI del cliente o escaneando su código QR
                </p>
            </div>
            <AsistenciasTabView />
        </main>
    );
}
