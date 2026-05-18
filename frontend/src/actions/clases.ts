"use server";

import { serverApi } from "@/lib/server-api";
import { ClaseTemplate } from "@/types/api";

export async function getClases(): Promise<ClaseTemplate[]> {
    try {
        const res = await serverApi("/clases/");
        if (!res.ok) return [];
        return res.json();
    } catch (error) {
        console.error("Get Clases Error:", error);
        return [];
    }
}

export async function getClase(claseId: string): Promise<ClaseTemplate | null> {
    try {
        const res = await serverApi(`/clases/${claseId}`);
        if (!res.ok) return null;
        return res.json();
    } catch (error) {
        console.error("Get Clase Error:", error);
        return null;
    }
}
