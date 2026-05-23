"use server";

import { serverApi } from "@/lib/server-api";
import { AsistenciaRecepcion } from "@/types/api";

export async function getAsistenciasClase(
    instanciaId: string,
): Promise<AsistenciaRecepcion[]> {
    try {
        const res = await serverApi(`/clases/instancias/${instanciaId}/asistencias`);
        if (!res.ok) return [];
        return res.json();
    } catch {
        return [];
    }
}
