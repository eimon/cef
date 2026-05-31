"use client";

import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

function addDays(dateStr: string, days: number): string {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    const ny = date.getFullYear();
    const nm = String(date.getMonth() + 1).padStart(2, "0");
    const nd = String(date.getDate()).padStart(2, "0");
    return `${ny}-${nm}-${nd}`;
}

function getCurrentSunday(): string {
    const today = new Date();
    const day = today.getDay(); // 0 = Sunday
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - day);
    const y = sunday.getFullYear();
    const m = String(sunday.getMonth() + 1).padStart(2, "0");
    const d = String(sunday.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function formatWeekRange(sundayStr: string): string {
    const [y, m, d] = sundayStr.split("-").map(Number);
    const sunday = new Date(y, m - 1, d);
    const saturday = new Date(y, m - 1, d + 6);

    const sameMonth = sunday.getMonth() === saturday.getMonth();
    const startDay = sunday.getDate();
    const endDay = saturday.getDate();
    const endMonth = new Intl.DateTimeFormat("es-AR", { month: "long" }).format(saturday);
    const year = saturday.getFullYear();

    if (sameMonth) {
        return `${startDay} – ${endDay} de ${endMonth} ${year}`;
    }
    const startMonth = new Intl.DateTimeFormat("es-AR", { month: "short" }).format(sunday);
    return `${startDay} ${startMonth} – ${endDay} de ${endMonth} ${year}`;
}

export default function WeekNavigation({ weekStart, canNavigatePast = false }: { weekStart: string; canNavigatePast?: boolean }) {
    const router = useRouter();
    const pathname = usePathname();
    const currentWeekStart = getCurrentSunday();
    const isCurrentWeek = weekStart === currentWeekStart;
    const isPreviousDisabled = isCurrentWeek && !canNavigatePast;

    const navigate = (dateStr: string) => {
        router.push(`${pathname}?fecha=${dateStr}`);
    };

    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={() => navigate(addDays(weekStart, -7))}
                disabled={isPreviousDisabled}
                className="p-2 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:hover:text-slate-500 disabled:hover:bg-transparent"
                aria-label="Semana anterior"
            >
                <ChevronLeft size={18} />
            </button>

            <div className="flex flex-col items-center min-w-[200px]">
                <span className="text-sm font-medium text-slate-700 capitalize leading-tight">
                    {formatWeekRange(weekStart)}
                </span>
                {isCurrentWeek && (
                    <span className="text-[10px] font-semibold text-cef-primary uppercase tracking-wider mt-0.5">
                        Semana actual
                    </span>
                )}
            </div>

            <button
                type="button"
                onClick={() => navigate(addDays(weekStart, 7))}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all"
                aria-label="Semana siguiente"
            >
                <ChevronRight size={18} />
            </button>

            {!isCurrentWeek && (
                <button
                    type="button"
                    onClick={() => navigate(currentWeekStart)}
                    className="ml-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 transition-all"
                >
                    Hoy
                </button>
            )}
        </div>
    );
}
