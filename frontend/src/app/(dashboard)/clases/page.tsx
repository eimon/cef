import { getClasesSemana } from "@/actions/clases";
import ClasesGrid from "@/components/ClasesGrid";
import WeekNavigation from "@/components/WeekNavigation";

function getMonday(dateStr?: string): string {
    const date = dateStr ? new Date(dateStr + "T12:00:00") : new Date();
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diff);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export default async function ClasesPage({
    searchParams,
}: {
    searchParams: Promise<{ fecha?: string }>;
}) {
    const { fecha } = await searchParams;
    const monday = getMonday(fecha);
    const clases = await getClasesSemana(monday);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white/90 tracking-tight">Clases</h1>
                    <p className="text-sm text-white/40 mt-1">Consultá horarios y cupos de cada clase.</p>
                </div>
                <WeekNavigation monday={monday} />
            </div>

            <ClasesGrid clases={clases} />
        </div>
    );
}
