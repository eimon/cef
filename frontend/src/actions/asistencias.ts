"use server";

import { serverApi } from "@/lib/server-api";
import { AsistenciaRecepcion } from "@/types/api";

export type AsistenciasClaseState = {
    data: AsistenciaRecepcion[];
    error?: string;
};

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
