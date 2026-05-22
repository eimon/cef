"use server";

import { serverApi } from "@/lib/server-api";
import { Sala } from "@/types/api";

export async function getSalas(): Promise<Sala[]> {
    try {
        const res = await serverApi("/salas/");
        if (!res.ok) return [];
        return res.json();
    } catch (error) {
        console.error("Get Salas Error:", error);
        return [];
    }
}
