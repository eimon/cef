import { getClases } from "@/actions/clases";
import ClasesGrid from "@/components/ClasesGrid";

export default async function ClasesPage() {
    const clases = await getClases();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-white/90 tracking-tight">Clases del Gimnasio</h1>
                <p className="text-sm text-white/40 mt-1">Explora las clases disponibles para la siguiente semana. Selecciona una para ver toda la información.</p>
            </div>

            <ClasesGrid clases={clases} />
        </div>
    );
}
