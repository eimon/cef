"use server";

import { serverApi } from "@/lib/server-api";
import {
    ActiveUsersByActivityReport,
    BillingReport,
    ClassCancellationsReport,
    ReportClassOption,
    UserRegistrationsReport,
} from "@/types/api";

async function getRegistrationsReport(endpoint: string): Promise<UserRegistrationsReport | null> {
    try {
        const res = await serverApi(endpoint);
        if (!res.ok) return null;
        return res.json();
    } catch (error) {
        console.error("Get Registrations Report Error:", error);
        return null;
    }
}

export async function getClientRegistrationsReport(): Promise<UserRegistrationsReport | null> {
    return getRegistrationsReport("/reports/clients-registrations");
}

export async function getStaffRegistrationsReport(): Promise<UserRegistrationsReport | null> {
    return getRegistrationsReport("/reports/staff-registrations");
}

export async function getDeletedUsersReport(): Promise<UserRegistrationsReport | null> {
    return getRegistrationsReport("/reports/deleted-users");
}

export async function getActiveUsersByActivityReport(): Promise<ActiveUsersByActivityReport | null> {
    try {
        const res = await serverApi("/reports/active-users-by-activity");
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
): Promise<ClassCancellationsReport | null> {
    try {
        const res = await serverApi(`/reports/class-cancellations/${classId}`);
        if (!res.ok) return null;
        return res.json();
    } catch (error) {
        console.error("Get Class Cancellations Report Error:", error);
        return null;
    }
}
