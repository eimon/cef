"use server";

import { serverApi } from "@/lib/server-api";

export type SimulacionResult = {
    error?: string;
    data?: Record<string, unknown>;
};

export async function ejecutarCronRenovaciones(): Promise<SimulacionResult> {
    const res = await serverApi("/suscripciones/cron/procesar", { method: "POST" });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return { error: errorData.detail || "Error al ejecutar el cron de renovaciones" };
    }

    const data = await res.json();
    return { data };
}
