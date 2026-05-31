import { redirect } from "next/navigation";
import { getClasesSemana } from "@/actions/clases";
import ClasesGrid from "@/components/ClasesGrid";
import WeekNavigation from "@/components/WeekNavigation";
import AddClaseDialog from "@/components/AddClaseDialog";
import { getUserRole } from "@/lib/auth";

const fmtArgDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });

function getSunday(dateStr?: string): string {
    const date = dateStr
        ? new Date(dateStr + "T12:00:00")
        : new Date(fmtArgDate.format(new Date()) + "T12:00:00");
    const day = date.getDay(); // 0 = Sunday
    date.setDate(date.getDate() - day);
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
    const weekStart = getSunday(fecha);
    const currentWeekStart = getSunday();
    const userRole = await getUserRole();
    const isStaff = userRole === "admin" || userRole === "recepcion";
    if (!isStaff && weekStart < currentWeekStart) redirect("/clases");
    const clases = await getClasesSemana(weekStart);
    const isPastWeek = weekStart < currentWeekStart;
    const clasesVisibles = isPastWeek && isStaff ? clases.filter((c) => c.instancia !== null) : clases;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Clases</h1>
                    <p className="text-sm text-slate-400 mt-1">Consultá horarios y cupos de cada clase.</p>
                </div>
                <div className="flex items-center gap-3">
                    {isStaff && <AddClaseDialog />}
                    <WeekNavigation weekStart={weekStart} canNavigatePast={isStaff} />
                </div>
            </div>

            <ClasesGrid clases={clasesVisibles} userRole={userRole} />
        </div>
    );
}
