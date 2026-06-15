import MarcarAsistenciaView from "@/components/MarcarAsistenciaView";

export default function AsistenciasPage() {
    return (
        <main className="p-6">
            <div className="mb-6">
                <h1 className="text-xl font-semibold text-slate-800">Marcar Asistencia</h1>
                <p className="text-sm text-slate-500 mt-1">
                    Ingresá el DNI del cliente para registrar su presencia en la clase
                </p>
            </div>
            <MarcarAsistenciaView />
        </main>
    );
}
