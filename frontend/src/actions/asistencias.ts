"use server";

import { serverApi } from "@/lib/server-api";
import { AsistenciaRecepcion, EscaneoQRResult } from "@/types/api";

export type AsistenciasClaseState = {
    data: AsistenciaRecepcion[];
    error?: string;
};

export async function escanearQR(dni: string): Promise<{ data?: EscaneoQRResult; error?: string }> {
    try {
        const res = await serverApi(`/asistencias/escanear/${encodeURIComponent(dni)}`);
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { error: (err as { detail?: string }).detail || "No se encontró el cliente" };
        }
        return { data: await res.json() };
    } catch {
        return { error: "Error al consultar el servidor" };
    }
}

export async function marcarPresente(asistenciaId: string): Promise<{ error?: string }> {
    try {
        const res = await serverApi(`/asistencias/${asistenciaId}/marcar-presente`, {
            method: "PATCH",
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { error: (err as { detail?: string }).detail || "No se pudo marcar la asistencia" };
        }
        return {};
    } catch {
        return { error: "Error al contactar el servidor" };
    }
}

export async function getAsistenciasClase(
    instanciaId: string,
): Promise<AsistenciasClaseState> {
    try {
        const res = await serverApi(`/clases/instancias/${instanciaId}/asistencias`);
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            return {
                data: [],
                error: errorData.detail || "No se pudieron cargar las asistencias",
            };
        }
        const data = await res.json();
        return { data };
    } catch (error) {
        console.error("Get Asistencias Clase Error:", error);
        return { data: [], error: "No se pudieron cargar las asistencias" };
    }
}
