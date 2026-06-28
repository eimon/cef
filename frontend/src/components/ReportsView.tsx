"use client";

import { FormEvent, useMemo, useState } from "react";
import { BarChart3, CalendarDays, CalendarX, ChevronLeft, ChevronRight, DollarSign, Loader2, UserX, Users, X } from "lucide-react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    LabelList,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import {
    getActiveUsersByActivityReport,
    getBillingReport,
    getClassCancellationsReport,
    getClientRegistrationsReport,
    getDeletedUsersReport,
    getStaffRegistrationsReport,
} from "@/actions/reports";
import {
    ActiveUsersByActivityReport,
    BillingReport,
    ClassCancellationsRankingReport,
    ReportClassOption,
    UserRegistrationsReport,
} from "@/types/api";

type ReportKind = "clients" | "staff" | "activeByActivity" | "billing" | "classCancellations" | "deletedUsers";
type ReportData = UserRegistrationsReport | ActiveUsersByActivityReport | BillingReport | ClassCancellationsRankingReport;

const DATE_INPUT_CLASS = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cef-primary";
const ARGENTINE_WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];

type ReportDefinition = {
    kind: ReportKind;
    title: string;
    modalTitle: string;
    chartLabel: string;
};

const reportDefinitions: ReportDefinition[] = [
    {
        kind: "clients",
        title: "Clientes registrados",
        modalTitle: "Clientes registrados",
        chartLabel: "Clientes",
    },
    {
        kind: "staff",
        title: "Personal registrado",
        modalTitle: "Personal registrado",
        chartLabel: "Personal",
    },
    {
        kind: "deletedUsers",
        title: "Usuarios dados de baja",
        modalTitle: "Usuarios dados de baja",
        chartLabel: "Usuarios dados de baja",
    },
    {
        kind: "activeByActivity",
        title: "Reservas por actividad",
        modalTitle: "Reservas por actividad",
        chartLabel: "Reservas",
    },
    {
        kind: "billing",
        title: "Facturación",
        modalTitle: "Facturación",
        chartLabel: "Facturación",
    },
    {
        kind: "classCancellations",
        title: "Cancelaciones por clase",
        modalTitle: "Cancelaciones por clase",
        chartLabel: "Cancelaciones",
    },
];

function formatPeriod(period: string, granularity: string): string {
    if (granularity === "weekly") {
        return formatWeekPeriod(period);
    }
    if (granularity === "quarterly") {
        const [year, quarter] = period.split("-Q");
        return `Trimestre ${quarter} ${year}`;
    }
    if (granularity === "semester") {
        const [year, semester] = period.split("-S");
        return `Semestre ${semester} ${year}`;
    }

    const [year, month] = period.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    const monthLabel = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(date);
    return `Mes ${monthLabel}`;
}

function formatClassDate(value: string): string {
    if (!isValidIsoDate(value)) return "Fecha invalida";
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" }).format(date);
}

function formatShortDate(value: Date): string {
    return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit" }).format(value);
}

function formatWeekPeriod(period: string): string {
    if (!isValidIsoDate(period)) {
        return period;
    }

    const [year, month, day] = period.split("-").map(Number);
    const weekStart = new Date(year, month - 1, day);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return `Semana ${formatShortDate(weekStart)} - ${formatShortDate(weekEnd)}`;
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 2,
    }).format(value);
}

function formatInputDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatArgentineInputDate(value: string): string {
    if (!isValidIsoDate(value)) return value;
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
}

function isoDateToLocalDate(value: string): Date | null {
    if (!isValidIsoDate(value)) return null;
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function firstDayOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number): Date {
    return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function calendarDaysForMonth(monthDate: Date): Array<Date | null> {
    const firstDay = firstDayOfMonth(monthDate);
    const offset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0).getDate();
    const days: Array<Date | null> = Array.from({ length: offset }, () => null);

    for (let day = 1; day <= daysInMonth; day += 1) {
        days.push(new Date(firstDay.getFullYear(), firstDay.getMonth(), day));
    }

    return days;
}

function normalizeArgentineDateInput(value: string): string {
    if (isValidIsoDate(value)) return formatArgentineInputDate(value);

    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseArgentineInputDate(value: string): string | null {
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;

    const [, day, month, year] = match;
    const isoDate = `${year}-${month}-${day}`;
    return isValidIsoDate(isoDate) ? isoDate : null;
}

function isValidIsoDate(value: string): boolean {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;

    const [, yearValue, monthValue, dayValue] = match;
    const year = Number(yearValue);
    const month = Number(monthValue);
    const day = Number(dayValue);
    const date = new Date(year, month - 1, day);

    return (
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
    );
}

function validatePeriod(startDate: string, endDate: string): string | null {
    if (!isValidIsoDate(startDate) || !isValidIsoDate(endDate)) {
        return "Ingrese un periodo valido";
    }
    if (startDate > endDate) {
        return "La fecha de inicio no puede ser posterior a la fecha de fin";
    }
    return null;
}

function ArgentineDateInput({
    id,
    value,
    onChange,
}: {
    id: string;
    value: string;
    onChange: (value: string) => void;
}) {
    const selectedDate = isoDateToLocalDate(value);
    const [isOpen, setIsOpen] = useState(false);
    const [visibleMonth, setVisibleMonth] = useState(() => firstDayOfMonth(selectedDate ?? new Date()));
    const calendarDays = useMemo(() => calendarDaysForMonth(visibleMonth), [visibleMonth]);
    const monthLabel = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(visibleMonth);

    return (
        <div className="relative">
            <div className="flex rounded-lg border border-slate-200 bg-white focus-within:border-cef-primary">
                <input
                    id={id}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="dd/mm/aaaa"
                    value={formatArgentineInputDate(value)}
                    onChange={(event) => {
                        const formatted = normalizeArgentineDateInput(event.target.value);
                        onChange(parseArgentineInputDate(formatted) ?? formatted);
                    }}
                    required
                    className={`${DATE_INPUT_CLASS} border-0 focus:border-transparent`}
                />
                <button
                    type="button"
                    onClick={() => {
                        setVisibleMonth(firstDayOfMonth(selectedDate ?? new Date()));
                        setIsOpen((current) => !current);
                    }}
                    className="inline-flex w-10 shrink-0 items-center justify-center rounded-r-lg text-slate-500 transition hover:bg-slate-100 hover:text-cef-primary"
                    aria-label="Abrir calendario"
                >
                    <CalendarDays size={16} />
                </button>
            </div>

            {isOpen && (
                <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                    <div className="mb-3 flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => setVisibleMonth((current) => addMonths(current, -1))}
                            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-cef-primary"
                            aria-label="Mes anterior"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <p className="text-sm font-semibold capitalize text-slate-800">{monthLabel}</p>
                        <button
                            type="button"
                            onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
                            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-cef-primary"
                            aria-label="Mes siguiente"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center">
                        {ARGENTINE_WEEKDAYS.map((day) => (
                            <span key={day} className="py-1 text-[11px] font-bold uppercase text-slate-400">
                                {day}
                            </span>
                        ))}
                        {calendarDays.map((date, index) => {
                            if (!date) {
                                return <span key={`empty-${index}`} className="h-8" />;
                            }

                            const dateValue = formatInputDate(date);
                            const isSelected = dateValue === value;
                            return (
                                <button
                                    key={dateValue}
                                    type="button"
                                    onClick={() => {
                                        onChange(dateValue);
                                        setIsOpen(false);
                                    }}
                                    className={`h-8 rounded-lg text-sm font-semibold transition ${
                                        isSelected
                                            ? "bg-cef-primary text-white"
                                            : "text-slate-700 hover:bg-cef-primary/10 hover:text-cef-primary"
                                    }`}
                                >
                                    {date.getDate()}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

function getDefaultPeriod(kind: ReportKind): { startDate: string; endDate: string } {
    const today = new Date();
    const start = new Date(today);

    if (kind === "clients" || kind === "staff" || kind === "deletedUsers") {
        start.setMonth(0, 1);
    } else if (kind === "billing") {
        start.setDate(1);
    } else {
        start.setDate(today.getDate() - 29);
    }

    return {
        startDate: formatInputDate(start),
        endDate: formatInputDate(today),
    };
}

function PeriodFilterPanel({
    startDate,
    endDate,
    error,
    isLoading,
    onStartDateChange,
    onEndDateChange,
    onSubmit,
}: {
    startDate: string;
    endDate: string;
    error?: string | null;
    isLoading: boolean;
    onStartDateChange: (value: string) => void;
    onEndDateChange: (value: string) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
    return (
        <form onSubmit={onSubmit} className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <div className="space-y-1.5">
                    <label htmlFor="report-start-date" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Inicio</label>
                    <ArgentineDateInput
                        id="report-start-date"
                        value={startDate}
                        onChange={onStartDateChange}
                    />
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="report-end-date" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fin</label>
                    <ArgentineDateInput
                        id="report-end-date"
                        value={endDate}
                        onChange={onEndDateChange}
                    />
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-cef-primary px-4 text-sm font-semibold text-white transition hover:bg-cef-primary/80 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Consultar"}
                </button>
            </div>
            {error && (
                <p className="mt-3 rounded-lg border border-cef-danger/30 bg-cef-danger/10 px-3 py-2 text-sm font-semibold text-cef-danger">
                    {error}
                </p>
            )}
        </form>
    );
}

function formatDay(value: string): string {
    const labels: Record<string, string> = {
        lunes: "Lunes",
        martes: "Martes",
        miercoles: "Miércoles",
        jueves: "Jueves",
        viernes: "Viernes",
        sabado: "Sábado",
        domingo: "Domingo",
    };

    return labels[value] ?? value;
}

function classSubtitle(clase: ReportClassOption): string {
    return `${formatDay(clase.dia_semana)} ${clase.hora_inicio} - ${clase.hora_fin}`;
}

function UsersChart({
    report,
    title,
    seriesLabel,
    lineColor = "#0f766e",
    activeLineColor = "#064e3b",
}: {
    report: UserRegistrationsReport;
    title: string;
    seriesLabel: string;
    lineColor?: string;
    activeLineColor?: string;
}) {
    const chartData = useMemo(
        () => {
            if (report.points.length === 0) {
                return [{ period: "Sin datos", total: 0 }];
            }

            return report.points.map((point) => ({
                period: formatPeriod(point.period, report.granularity),
                total: point.total_count,
            }));
        },
        [report.granularity, report.points]
    );

    const yTicks = useMemo(() => {
        const maxTotal = Math.max(...chartData.map((point) => point.total), 0);
        return Array.from({ length: maxTotal + 2 }, (_, index) => index);
    }, [chartData]);

    return (
        <div>
        <div className="h-[420px] overflow-hidden rounded-xl border border-slate-200 bg-white px-3 pb-2 pt-4" aria-label={title}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 28, bottom: 6, left: 0 }}>
                    <CartesianGrid stroke="rgba(15, 23, 42, 0.12)" vertical={false} />
                    <XAxis
                        dataKey="period"
                        tick={{ fill: "#064e3b", fontSize: 13, fontWeight: 700 }}
                        tickLine={false}
                        axisLine={{ stroke: "#0f766e" }}
                    />
                    <YAxis
                        domain={[0, Math.max(...yTicks)]}
                        ticks={yTicks}
                        allowDecimals={false}
                        tick={{ fill: "#0f172a", fontSize: 13, fontWeight: 700 }}
                        tickLine={false}
                        axisLine={{ stroke: "#0f766e" }}
                    />
                    <Tooltip
                        formatter={(value) => [value, seriesLabel]}
                        labelStyle={{ color: "#0f172a", fontWeight: 700 }}
                        contentStyle={{
                            borderRadius: 10,
                            border: "1px solid rgba(15, 118, 110, 0.28)",
                            color: "#0f172a",
                        }}
                    />
                    <Line
                        name={seriesLabel}
                        type="monotone"
                        dataKey="total"
                        stroke={lineColor}
                        strokeWidth={4}
                        dot={{ r: 7, fill: "#facc15", stroke: lineColor, strokeWidth: 3 }}
                        activeDot={{ r: 9, fill: "#facc15", stroke: activeLineColor, strokeWidth: 3 }}
                        isAnimationActive={false}
                    >
                        <LabelList
                            dataKey="total"
                            position="top"
                            offset={8}
                            fill="#0f172a"
                            fontSize={18}
                            fontWeight={800}
                        />
                    </Line>
                </LineChart>
            </ResponsiveContainer>
        </div>
        </div>
    );
}

const activityColors = ["#0f766e", "#2563eb", "#c2410c", "#7c3aed", "#be123c", "#4d7c0f", "#0891b2", "#b45309"];

function ActivityUsersBarChart({
    report,
    title,
    seriesLabel,
}: {
    report: ActiveUsersByActivityReport;
    title: string;
    seriesLabel: string;
}) {
    const activities = useMemo(
        () => {
            const values = Array.from(new Set(report.points.map((point) => point.activity))).sort();
            return values.length > 0 ? values : [seriesLabel];
        },
        [report.points, seriesLabel]
    );
    const chartData = useMemo(() => {
        const periods = Array.from(new Set(report.points.map((point) => point.period)));
        if (periods.length === 0) {
            return [{ period: "Sin datos", [seriesLabel]: 0 }];
        }

        return periods.map((period) => {
            const item: Record<string, string | number> = {
                period: formatPeriod(period, report.granularity),
            };
            for (const activity of activities) {
                item[activity] = 0;
            }
            for (const point of report.points.filter((entry) => entry.period === period)) {
                item[point.activity] = point.total_count;
            }
            return item;
        });
    }, [activities, report.granularity, report.points, seriesLabel]);

    const yTicks = useMemo(() => {
        const maxTotal = Math.max(
            ...chartData.map((point) =>
                activities.reduce((sum, activity) => sum + Number(point[activity] ?? 0), 0)
            ),
            0
        );
        return Array.from({ length: maxTotal + 2 }, (_, index) => index);
    }, [activities, chartData]);

    return (
        <div>
        <div className="h-[420px] overflow-hidden rounded-xl border border-slate-200 bg-white px-3 pb-2 pt-4" aria-label={title}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 28, bottom: 12, left: 0 }}>
                    <CartesianGrid stroke="rgba(15, 23, 42, 0.12)" vertical={false} />
                    <XAxis
                        dataKey="period"
                        tick={{ fill: "#064e3b", fontSize: 12, fontWeight: 700 }}
                        tickLine={false}
                        axisLine={{ stroke: "#0f766e" }}
                        interval={0}
                    />
                    <YAxis
                        domain={[0, Math.max(...yTicks)]}
                        ticks={yTicks}
                        allowDecimals={false}
                        tick={{ fill: "#0f172a", fontSize: 13, fontWeight: 700 }}
                        tickLine={false}
                        axisLine={{ stroke: "#0f766e" }}
                    />
                    <Tooltip
                        formatter={(value, name) => [value, String(name)]}
                        labelStyle={{ color: "#0f172a", fontWeight: 700 }}
                        contentStyle={{
                            borderRadius: 10,
                            border: "1px solid rgba(15, 118, 110, 0.28)",
                            color: "#0f172a",
                        }}
                    />
                    {activities.map((activity, index) => (
                        <Bar
                            key={activity}
                            name={activity}
                            dataKey={activity}
                            stackId={seriesLabel}
                            fill={activityColors[index % activityColors.length]}
                            radius={index === activities.length - 1 ? [10, 10, 0, 0] : [0, 0, 0, 0]}
                            isAnimationActive={false}
                        >
                            <LabelList
                                dataKey={activity}
                                position="top"
                                offset={6}
                                fill="#0f172a"
                                fontSize={12}
                                fontWeight={800}
                            />
                        </Bar>
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </div>
        </div>
    );
}

function ClassCancellationsRankingPanel({
    report,
    startDate,
    endDate,
    error,
    isLoading,
    onStartDateChange,
    onEndDateChange,
    onSubmit,
}: {
    report: ClassCancellationsRankingReport | null;
    startDate: string;
    endDate: string;
    error: string | null;
    isLoading: boolean;
    onStartDateChange: (value: string) => void;
    onEndDateChange: (value: string) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
    return (
        <div className="space-y-3">
            <PeriodFilterPanel
                startDate={startDate}
                endDate={endDate}
                error={error}
                isLoading={isLoading}
                onStartDateChange={onStartDateChange}
                onEndDateChange={onEndDateChange}
                onSubmit={onSubmit}
            />

            {isLoading ? (
                <div className="grid h-80 place-items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-cef-primary" />
                </div>
            ) : report ? (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                        <div>
                            <p className="text-sm font-semibold text-slate-800">Ranking de clases</p>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-cef-primary">
                                {formatClassDate(startDate)} - {formatClassDate(endDate)}
                            </p>
                        </div>
                        <div className="rounded-lg bg-cef-danger/10 px-3 py-2 text-right">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-cef-danger">Total</p>
                            <p className="text-lg font-black text-slate-900">{report.total_count}</p>
                        </div>
                    </div>
                    <div className="max-h-[58vh] overflow-auto">
                        <table className="w-full min-w-[720px] border-collapse text-left">
                            <thead className="sticky top-0 z-10 bg-white">
                                <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                                    <th className="w-20 px-4 py-3">Puesto</th>
                                    <th className="px-4 py-3">Clase</th>
                                    <th className="px-4 py-3">Horario</th>
                                    <th className="px-4 py-3 text-right">Cancelaciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.items.map((item, index) => (
                                    <tr key={item.clase.id} className="border-b border-slate-100 last:border-0">
                                        <td className="px-4 py-3">
                                            <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-slate-100 px-2 text-sm font-black text-slate-700">
                                                {index + 1}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="text-sm font-semibold text-slate-900">{item.clase.disciplina}</p>
                                            <p className="mt-1 text-xs text-slate-500">{item.clase.nombre}</p>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-slate-600">
                                            {classSubtitle(item.clase)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-lg font-black text-slate-950">{item.total_count}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid h-80 place-items-center">
                    <p className="text-sm text-cef-danger">No se pudo cargar el reporte.</p>
                </div>
            )}
        </div>
    );
}

function BillingReportPanel({
    report,
    error,
    startDate,
    endDate,
    isLoading,
    onStartDateChange,
    onEndDateChange,
    onSubmit,
}: {
    report: BillingReport | null;
    error: string | null;
    startDate: string;
    endDate: string;
    isLoading: boolean;
    onStartDateChange: (value: string) => void;
    onEndDateChange: (value: string) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
    const chartData = useMemo(
        () => {
            if (!report || report.points.length === 0) {
                return [{ period: "Sin datos", total: 0 }];
            }

            return report.points.map((point) => ({
                period: formatPeriod(point.period, report.granularity),
                total: point.total_revenue,
            }));
        },
        [report]
    );

    return (
        <div className="mx-auto w-full max-w-4xl space-y-4">
            <PeriodFilterPanel
                startDate={startDate}
                endDate={endDate}
                error={error}
                isLoading={isLoading}
                onStartDateChange={onStartDateChange}
                onEndDateChange={onEndDateChange}
                onSubmit={onSubmit}
            />

            {report ? (
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Ganancia total</p>
                    <p className="mt-2 text-3xl font-black text-slate-950">{formatCurrency(report.total_revenue)}</p>
                    <div className="mt-3 h-[360px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50 px-3 pb-2 pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 28, bottom: 12, left: 0 }}>
                                <CartesianGrid stroke="rgba(15, 23, 42, 0.12)" vertical={false} />
                                <XAxis
                                    dataKey="period"
                                    tick={{ fill: "#064e3b", fontSize: 12, fontWeight: 700 }}
                                    tickLine={false}
                                    axisLine={{ stroke: "#0f766e" }}
                                    interval={0}
                                />
                                <YAxis
                                    tickFormatter={(value) => formatCurrency(Number(value))}
                                    tick={{ fill: "#0f172a", fontSize: 12, fontWeight: 700 }}
                                    tickLine={false}
                                    axisLine={{ stroke: "#0f766e" }}
                                />
                                <Tooltip
                                    formatter={(value) => [formatCurrency(Number(value)), "Facturacion"]}
                                    labelStyle={{ color: "#0f172a", fontWeight: 700 }}
                                    contentStyle={{
                                        borderRadius: 10,
                                        border: "1px solid rgba(15, 118, 110, 0.28)",
                                        color: "#0f172a",
                                    }}
                                />
                                <Bar
                                    name="Facturacion"
                                    dataKey="total"
                                    fill="#0f766e"
                                    radius={[10, 10, 0, 0]}
                                    isAnimationActive={false}
                                >
                                    <LabelList
                                        dataKey="total"
                                        position="top"
                                        offset={8}
                                        fill="#0f172a"
                                        fontSize={14}
                                        fontWeight={800}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function ReportModal({
    definition,
    report,
    isLoading,
    billingError,
    billingStartDate,
    billingEndDate,
    onClose,
    onBillingStartDateChange,
    onBillingEndDateChange,
    onBillingSubmit,
}: {
    definition: ReportDefinition;
    report: ReportData | null;
    isLoading: boolean;
    billingError: string | null;
    billingStartDate: string;
    billingEndDate: string;
    onClose: () => void;
    onBillingStartDateChange: (value: string) => void;
    onBillingEndDateChange: (value: string) => void;
    onBillingSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
    const modalWidth = definition.kind === "billing" ? "max-w-4xl" : "max-w-5xl";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className={`glass-modal max-h-[88vh] w-full ${modalWidth} overflow-hidden rounded-2xl shadow-2xl`}>
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-2.5">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">{definition.modalTitle}</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Cerrar reporte"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="max-h-[calc(88vh-58px)] overflow-y-auto p-3">
                    {definition.kind === "billing" ? (
                        <BillingReportPanel
                            report={report as BillingReport | null}
                            error={billingError}
                            startDate={billingStartDate}
                            endDate={billingEndDate}
                            isLoading={isLoading}
                            onStartDateChange={onBillingStartDateChange}
                            onEndDateChange={onBillingEndDateChange}
                            onSubmit={onBillingSubmit}
                        />
                    ) : definition.kind === "classCancellations" ? (
                        <ClassCancellationsRankingPanel
                            report={report as ClassCancellationsRankingReport | null}
                            startDate={billingStartDate}
                            endDate={billingEndDate}
                            error={billingError}
                            isLoading={isLoading}
                            onStartDateChange={onBillingStartDateChange}
                            onEndDateChange={onBillingEndDateChange}
                            onSubmit={onBillingSubmit}
                        />
                    ) : (
                        <>
                            <PeriodFilterPanel
                                startDate={billingStartDate}
                                endDate={billingEndDate}
                                error={billingError}
                                isLoading={isLoading}
                                onStartDateChange={onBillingStartDateChange}
                                onEndDateChange={onBillingEndDateChange}
                                onSubmit={onBillingSubmit}
                            />
                            {isLoading ? (
                                <div className="grid h-80 place-items-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-cef-primary" />
                                </div>
                            ) : report && definition.kind === "activeByActivity" ? (
                                <ActivityUsersBarChart
                                    report={report as ActiveUsersByActivityReport}
                                    title={definition.modalTitle}
                                    seriesLabel={definition.chartLabel}
                                />
                            ) : report ? (
                                <UsersChart
                                    report={report as UserRegistrationsReport}
                                    title={definition.modalTitle}
                                    seriesLabel={definition.chartLabel}
                                    lineColor={definition.kind === "deletedUsers" ? "#be123c" : undefined}
                                    activeLineColor={definition.kind === "deletedUsers" ? "#881337" : undefined}
                                />
                            ) : (
                                <div className="grid h-80 place-items-center">
                                    <p className="text-sm text-cef-danger">No se pudo cargar el reporte.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ReportsView() {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [report, setReport] = useState<ReportData | null>(null);
    const [activeReport, setActiveReport] = useState<ReportDefinition>(reportDefinitions[0]);
    const [billingStartDate, setBillingStartDate] = useState("");
    const [billingEndDate, setBillingEndDate] = useState("");
    const [billingError, setBillingError] = useState<string | null>(null);

    const loadReportData = async (
        definition: ReportDefinition,
        startDate: string,
        endDate: string,
    ) => {
        const periodError = validatePeriod(startDate, endDate);
        if (periodError) {
            setBillingError(periodError);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setBillingError(null);
        setReport(null);

        if (definition.kind === "billing") {
            const result = await getBillingReport(startDate, endDate);
            if (result.error) {
                setBillingError(result.error);
            } else {
                setReport(result.data ?? null);
            }
            setIsLoading(false);
            return;
        }

        if (definition.kind === "classCancellations") {
            const data = await getClassCancellationsReport(startDate, endDate);
            setReport(data);
            setIsLoading(false);
            return;
        }

        const data = definition.kind === "clients"
            ? await getClientRegistrationsReport(startDate, endDate)
            : definition.kind === "staff"
                ? await getStaffRegistrationsReport(startDate, endDate)
                : definition.kind === "deletedUsers"
                    ? await getDeletedUsersReport(startDate, endDate)
                    : await getActiveUsersByActivityReport(startDate, endDate);
        setReport(data);
        setIsLoading(false);
    };

    const openReport = async (definition: ReportDefinition) => {
        const defaultPeriod = getDefaultPeriod(definition.kind);
        setActiveReport(definition);
        setIsOpen(true);
        setReport(null);
        setBillingError(null);
        setBillingStartDate(defaultPeriod.startDate);
        setBillingEndDate(defaultPeriod.endDate);

        if (definition.kind === "billing") {
            await loadReportData(definition, defaultPeriod.startDate, defaultPeriod.endDate);
            return;
        }

        await loadReportData(definition, defaultPeriod.startDate, defaultPeriod.endDate);
    };

    const handleBillingSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        await loadReportData(activeReport, billingStartDate, billingEndDate);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Reportes</h1>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {reportDefinitions.map((definition) => (
                    <div key={definition.kind} className="glass rounded-xl p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="rounded-xl bg-cef-primary/10 p-3 text-cef-primary">
                                    {definition.kind === "billing" ? (
                                        <DollarSign size={24} />
                                    ) : definition.kind === "deletedUsers" ? (
                                        <UserX size={24} />
                                    ) : definition.kind === "classCancellations" ? (
                                        <CalendarX size={24} />
                                    ) : (
                                        <Users size={24} />
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-base font-semibold text-slate-800">{definition.title}</h2>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => openReport(definition)}
                                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cef-primary text-white transition hover:bg-cef-primary/80"
                                aria-label={`Ver reporte de ${definition.title.toLowerCase()}`}
                                title="Ver reporte"
                            >
                                <BarChart3 size={20} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {isOpen && (
                <ReportModal
                    definition={activeReport}
                    report={report}
                    isLoading={isLoading}
                    billingError={billingError}
                    billingStartDate={billingStartDate}
                    billingEndDate={billingEndDate}
                    onClose={() => setIsOpen(false)}
                    onBillingStartDateChange={setBillingStartDate}
                    onBillingEndDateChange={setBillingEndDate}
                    onBillingSubmit={handleBillingSubmit}
                />
            )}
        </div>
    );
}
