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

function getCurrentMonday(): string {
    const today = new Date();
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    const y = monday.getFullYear();
    const m = String(monday.getMonth() + 1).padStart(2, "0");
    const d = String(monday.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function formatWeekRange(mondayStr: string): string {
    const [y, m, d] = mondayStr.split("-").map(Number);
    const monday = new Date(y, m - 1, d);
    const sunday = new Date(y, m - 1, d + 6);

    const sameMonth = monday.getMonth() === sunday.getMonth();
    const startDay = monday.getDate();
    const endDay = sunday.getDate();
    const endMonth = new Intl.DateTimeFormat("es-AR", { month: "long" }).format(sunday);
    const year = sunday.getFullYear();

    if (sameMonth) {
        return `${startDay} – ${endDay} de ${endMonth} ${year}`;
    }
    const startMonth = new Intl.DateTimeFormat("es-AR", { month: "short" }).format(monday);
    return `${startDay} ${startMonth} – ${endDay} de ${endMonth} ${year}`;
}

export default function WeekNavigation({ monday }: { monday: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const currentMonday = getCurrentMonday();
    const isCurrentWeek = monday === currentMonday;

    const navigate = (dateStr: string) => {
        router.push(`${pathname}?fecha=${dateStr}`);
    };

    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={() => navigate(addDays(monday, -7))}
                className="p-2 rounded-lg text-white/50 hover:text-white/90 hover:bg-white/[0.06] transition-all"
                aria-label="Semana anterior"
            >
                <ChevronLeft size={18} />
            </button>

            <div className="flex flex-col items-center min-w-[200px]">
                <span className="text-sm font-medium text-white/80 capitalize leading-tight">
                    {formatWeekRange(monday)}
                </span>
                {isCurrentWeek && (
                    <span className="text-[10px] font-semibold text-cef-primary/80 uppercase tracking-wider mt-0.5">
                        Semana actual
                    </span>
                )}
            </div>

            <button
                type="button"
                onClick={() => navigate(addDays(monday, 7))}
                className="p-2 rounded-lg text-white/50 hover:text-white/90 hover:bg-white/[0.06] transition-all"
                aria-label="Semana siguiente"
            >
                <ChevronRight size={18} />
            </button>

            {!isCurrentWeek && (
                <button
                    type="button"
                    onClick={() => navigate(currentMonday)}
                    className="ml-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-white/80 hover:bg-white/[0.05] border border-white/[0.07] transition-all"
                >
                    Hoy
                </button>
            )}
        </div>
    );
}
