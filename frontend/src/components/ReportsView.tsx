"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowLeft, BarChart3, CalendarX, DollarSign, Loader2, UserX, Users, X } from "lucide-react";
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
    getReportClasses,
    getStaffRegistrationsReport,
} from "@/actions/reports";
import {
    ActiveUsersByActivityReport,
    BillingReport,
    ClassCancellationsReport,
    ReportClassOption,
    UserRegistrationsReport,
} from "@/types/api";

type ReportKind = "clients" | "staff" | "activeByActivity" | "billing" | "classCancellations" | "deletedUsers";
type ReportData = UserRegistrationsReport | ActiveUsersByActivityReport | BillingReport | ClassCancellationsReport;

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
        title: "Usuarios eliminados",
        modalTitle: "Usuarios eliminados",
        chartLabel: "Usuarios eliminados",
    },
    {
        kind: "activeByActivity",
        title: "Usuarios activos por actividad",
        modalTitle: "Usuarios activos por actividad",
        chartLabel: "Usuarios activos",
    },
    {
        kind: "billing",
        title: "Facturación por período",
        modalTitle: "Facturación por período",
        chartLabel: "Facturación",
    },
    {
        kind: "classCancellations",
        title: "Cancelaciones por clase",
        modalTitle: "Cancelaciones por clase",
        chartLabel: "Cancelaciones",
    },
];

function formatPeriod(period: string): string {
    const [year, month] = period.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return new Intl.DateTimeFormat("es-AR", { month: "short", year: "2-digit" }).format(date);
}

function formatClassDate(value: string): string {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" }).format(date);
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 2,
    }).format(value);
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
        () =>
            report.points.map((point) => ({
                period: formatPeriod(point.period),
                total: point.total_count,
            })),
        [report.points]
    );

    const yTicks = useMemo(() => {
        const maxTotal = Math.max(...report.points.map((point) => point.total_count), 0);
        return Array.from({ length: maxTotal + 2 }, (_, index) => index);
    }, [report.points]);

    if (report.points.length === 0) {
        return (
            <div className="h-64 rounded-xl border border-slate-200 bg-slate-50 grid place-items-center">
                <p className="text-sm font-medium text-slate-600">Sin datos mensuales.</p>
            </div>
        );
    }

    return (
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
    );
}

function ActivityUsersBarChart({
    report,
    title,
    seriesLabel,
}: {
    report: ActiveUsersByActivityReport;
    title: string;
    seriesLabel: string;
}) {
    const chartData = useMemo(
        () =>
            report.points.map((point) => ({
                activity: point.activity,
                total: point.total_count,
            })),
        [report.points]
    );

    const yTicks = useMemo(() => {
        const maxTotal = Math.max(...report.points.map((point) => point.total_count), 0);
        return Array.from({ length: maxTotal + 2 }, (_, index) => index);
    }, [report.points]);

    if (report.points.length === 0) {
        return (
            <div className="h-64 rounded-xl border border-slate-200 bg-slate-50 grid place-items-center">
                <p className="text-sm font-medium text-slate-600">Sin usuarios activos esta semana.</p>
            </div>
        );
    }

    return (
        <div className="h-[420px] overflow-hidden rounded-xl border border-slate-200 bg-white px-3 pb-2 pt-4" aria-label={title}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 28, bottom: 12, left: 0 }}>
                    <CartesianGrid stroke="rgba(15, 23, 42, 0.12)" vertical={false} />
                    <XAxis
                        dataKey="activity"
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
                        formatter={(value) => [value, seriesLabel]}
                        labelStyle={{ color: "#0f172a", fontWeight: 700 }}
                        contentStyle={{
                            borderRadius: 10,
                            border: "1px solid rgba(15, 118, 110, 0.28)",
                            color: "#0f172a",
                        }}
                    />
                    <Bar
                        name={seriesLabel}
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
                            fontSize={18}
                            fontWeight={800}
                        />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

function ClassSelectionPanel({
    classes,
    isLoading,
    onSelect,
}: {
    classes: ReportClassOption[];
    isLoading: boolean;
    onSelect: (classId: string) => void;
}) {
    if (isLoading) {
        return (
            <div className="grid h-80 place-items-center">
                <Loader2 className="h-8 w-8 animate-spin text-cef-primary" />
            </div>
        );
    }

    if (classes.length === 0) {
        return (
            <div className="grid h-80 place-items-center rounded-xl border border-slate-200 bg-slate-50">
                <p className="text-sm font-medium text-slate-600">No hay clases disponibles para reportar.</p>
            </div>
        );
    }

    return (
        <div className="grid max-h-[62vh] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
            {classes.map((clase) => (
                <button
                    key={clase.id}
                    type="button"
                    onClick={() => onSelect(clase.id)}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-cef-primary/40 hover:bg-cef-primary/5"
                >
                    <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-cef-primary/15 p-2.5 text-cef-primary">
                            <CalendarX size={20} />
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">{clase.disciplina}</p>
                            <p className="mt-1 text-xs font-medium text-slate-500">{classSubtitle(clase)}</p>
                            <p className="mt-2 text-xs text-slate-400">{clase.nombre}</p>
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
}

function ClassCancellationsChart({
    report,
    seriesLabel,
    onBack,
}: {
    report: ClassCancellationsReport;
    seriesLabel: string;
    onBack: () => void;
}) {
    const chartData = useMemo(
        () =>
            report.points.map((point) => ({
                classDate: formatClassDate(point.class_date),
                total: point.total_count,
            })),
        [report.points]
    );

    const yTicks = useMemo(() => {
        const maxTotal = Math.max(...report.points.map((point) => point.total_count), 0);
        return Array.from({ length: maxTotal + 2 }, (_, index) => index);
    }, [report.points]);

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                    <p className="text-sm font-semibold text-slate-800">{report.clase.disciplina}</p>
                    <p className="mt-0.5 text-xs font-medium text-slate-500">{classSubtitle(report.clase)}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-cef-primary">Últimos 30 días</p>
                </div>
                <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-cef-primary/5 hover:text-cef-primary"
                >
                    <ArrowLeft size={14} />
                    Elegir otra clase
                </button>
            </div>

            {report.points.length === 0 ? (
                <div className="grid h-64 place-items-center rounded-xl border border-slate-200 bg-slate-50">
                    <p className="text-sm font-medium text-slate-600">No hubo ocurrencias de esta clase en los últimos 30 días.</p>
                </div>
            ) : (
                <div className="h-[420px] overflow-hidden rounded-xl border border-slate-200 bg-white px-3 pb-2 pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 28, bottom: 12, left: 0 }}>
                            <CartesianGrid stroke="rgba(15, 23, 42, 0.12)" vertical={false} />
                            <XAxis
                                dataKey="classDate"
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
                            <Bar
                                name={seriesLabel}
                                dataKey="total"
                                fill="#be123c"
                                radius={[10, 10, 0, 0]}
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
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
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
    return (
        <div className="mx-auto w-full max-w-xl space-y-4">
            <form onSubmit={onSubmit} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
                    <label className="space-y-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Inicio</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(event) => onStartDateChange(event.target.value)}
                            required
                            className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 px-3 py-2 text-sm font-medium outline-none transition focus:border-cef-primary"
                        />
                    </label>
                    <label className="space-y-1.5">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fin</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(event) => onEndDateChange(event.target.value)}
                            required
                            className="w-full rounded-lg border border-slate-200 bg-white text-slate-900 px-3 py-2 text-sm font-medium outline-none transition focus:border-cef-primary"
                        />
                    </label>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="inline-flex h-10 items-center justify-center rounded-lg bg-cef-primary px-4 text-sm font-semibold text-white transition hover:bg-cef-primary/80 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Consultar"}
                    </button>
                </div>
            </form>

            {error && (
                <div className="rounded-xl border border-cef-danger/30 bg-cef-danger/10 p-4">
                    <p className="text-sm font-semibold text-cef-danger">{error}</p>
                </div>
            )}

            {report && (
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                    {report.message ? (
                        <p className="text-base font-semibold text-slate-900">{report.message}</p>
                    ) : (
                        <>
                            <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Ganancia total</p>
                            <p className="mt-2 text-3xl font-black text-slate-950">{formatCurrency(report.total_revenue)}</p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

function ReportModal({
    definition,
    report,
    reportClasses,
    isLoading,
    billingError,
    billingStartDate,
    billingEndDate,
    onClose,
    onClassSelect,
    onClassBack,
    onBillingStartDateChange,
    onBillingEndDateChange,
    onBillingSubmit,
}: {
    definition: ReportDefinition;
    report: ReportData | null;
    reportClasses: ReportClassOption[];
    isLoading: boolean;
    billingError: string | null;
    billingStartDate: string;
    billingEndDate: string;
    onClose: () => void;
    onClassSelect: (classId: string) => void;
    onClassBack: () => void;
    onBillingStartDateChange: (value: string) => void;
    onBillingEndDateChange: (value: string) => void;
    onBillingSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
    const modalWidth = definition.kind === "billing" ? "max-w-2xl" : "max-w-5xl";

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
                        report ? (
                            <ClassCancellationsChart
                                report={report as ClassCancellationsReport}
                                seriesLabel={definition.chartLabel}
                                onBack={onClassBack}
                            />
                        ) : (
                            <ClassSelectionPanel
                                classes={reportClasses}
                                isLoading={isLoading}
                                onSelect={onClassSelect}
                            />
                        )
                    ) : isLoading ? (
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
                </div>
            </div>
        </div>
    );
}

export default function ReportsView() {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [report, setReport] = useState<ReportData | null>(null);
    const [reportClasses, setReportClasses] = useState<ReportClassOption[]>([]);
    const [activeReport, setActiveReport] = useState<ReportDefinition>(reportDefinitions[0]);
    const [billingStartDate, setBillingStartDate] = useState("");
    const [billingEndDate, setBillingEndDate] = useState("");
    const [billingError, setBillingError] = useState<string | null>(null);

    const openReport = async (definition: ReportDefinition) => {
        setActiveReport(definition);
        setIsOpen(true);
        setReport(null);
        setBillingError(null);

        if (definition.kind === "billing") {
            setIsLoading(false);
            return;
        }

        if (definition.kind === "classCancellations") {
            setIsLoading(true);
            setReportClasses(await getReportClasses());
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const data = definition.kind === "clients"
            ? await getClientRegistrationsReport()
            : definition.kind === "staff"
                ? await getStaffRegistrationsReport()
                : definition.kind === "deletedUsers"
                    ? await getDeletedUsersReport()
                    : await getActiveUsersByActivityReport();
        setReport(data);
        setIsLoading(false);
    };

    const handleClassSelect = async (classId: string) => {
        setIsLoading(true);
        setReport(null);
        const data = await getClassCancellationsReport(classId);
        setReport(data);
        setIsLoading(false);
    };

    const handleClassBack = () => {
        setReport(null);
    };

    const handleBillingSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        setBillingError(null);
        setReport(null);

        const result = await getBillingReport(billingStartDate, billingEndDate);
        if (result.error) {
            setBillingError(result.error);
        } else {
            setReport(result.data ?? null);
        }

        setIsLoading(false);
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
                    reportClasses={reportClasses}
                    isLoading={isLoading}
                    billingError={billingError}
                    billingStartDate={billingStartDate}
                    billingEndDate={billingEndDate}
                    onClose={() => setIsOpen(false)}
                    onClassSelect={handleClassSelect}
                    onClassBack={handleClassBack}
                    onBillingStartDateChange={setBillingStartDate}
                    onBillingEndDateChange={setBillingEndDate}
                    onBillingSubmit={handleBillingSubmit}
                />
            )}
        </div>
    );
}
