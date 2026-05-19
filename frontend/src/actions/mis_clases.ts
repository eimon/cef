"use server";

import { serverApi } from "@/lib/server-api";
import { MiClaseIndividual, MiSuscripcion } from "@/types/api";

export async function getMisClasesIndividuales(): Promise<MiClaseIndividual[]> {
    try {
        const res = await serverApi("/mis-clases/individuales");
        if (!res.ok) return [];
        return res.json();
    } catch {
        return [];
    }
}

export async function getMisSuscripciones(): Promise<MiSuscripcion[]> {
    try {
        const res = await serverApi("/mis-clases/suscripciones");
        if (!res.ok) return [];
        return res.json();
    } catch {
        return [];
    }
}
