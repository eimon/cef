"use server";

import { serverApi } from "@/lib/server-api";
import {
    ActiveUsersByActivityReport,
    BillingReport,
    ClassCancellationsReport,
    ReportClassOption,
    UserRegistrationsReport,
} from "@/types/api";

function periodParams(startDate?: string, endDate?: string): Record<string, string> {
    return {
        ...(startDate ? { start_date: startDate } : {}),
        ...(endDate ? { end_date: endDate } : {}),
    };
}

async function getRegistrationsReport(
    endpoint: string,
    startDate?: string,
    endDate?: string,
): Promise<UserRegistrationsReport | null> {
    try {
        const res = await serverApi(endpoint, { params: periodParams(startDate, endDate) });
        if (!res.ok) return null;
        return res.json();
    } catch (error) {
        console.error("Get Registrations Report Error:", error);
        return null;
    }
}

export async function getClientRegistrationsReport(
    startDate?: string,
    endDate?: string,
): Promise<UserRegistrationsReport | null> {
    return getRegistrationsReport("/reports/clients-registrations", startDate, endDate);
}

export async function getStaffRegistrationsReport(
    startDate?: string,
    endDate?: string,
): Promise<UserRegistrationsReport | null> {
    return getRegistrationsReport("/reports/staff-registrations", startDate, endDate);
}

export async function getDeletedUsersReport(
    startDate?: string,
    endDate?: string,
): Promise<UserRegistrationsReport | null> {
    return getRegistrationsReport("/reports/deleted-users", startDate, endDate);
}

export async function getActiveUsersByActivityReport(
    startDate?: string,
    endDate?: string,
): Promise<ActiveUsersByActivityReport | null> {
    try {
        const res = await serverApi("/reports/active-users-by-activity", {
            params: periodParams(startDate, endDate),
        });
        if (!res.ok) return null;
        return res.json();
    } catch (error) {
        console.error("Get Active Users By Activity Report Error:", error);
        return null;
    }
}

export async function getBillingReport(
    startDate: string,
    endDate: string,
): Promise<{ data?: BillingReport; error?: string }> {
    try {
        const res = await serverApi("/reports/billing", {
            params: {
                start_date: startDate,
                end_date: endDate,
            },
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return { error: errorData.detail || "No se pudo cargar el reporte." };
        }

        return { data: await res.json() };
    } catch (error) {
        console.error("Get Billing Report Error:", error);
        return { error: "No se pudo cargar el reporte." };
    }
}

export async function getReportClasses(): Promise<ReportClassOption[]> {
    try {
        const res = await serverApi("/reports/classes");
        if (!res.ok) return [];
        return res.json();
    } catch (error) {
        console.error("Get Report Classes Error:", error);
        return [];
    }
}

export async function getClassCancellationsReport(
    classId: string,
    startDate?: string,
    endDate?: string,
): Promise<ClassCancellationsReport | null> {
    try {
        const res = await serverApi(`/reports/class-cancellations/${classId}`, {
            params: periodParams(startDate, endDate),
        });
        if (!res.ok) return null;
        return res.json();
    } catch (error) {
        console.error("Get Class Cancellations Report Error:", error);
        return null;
    }
}
