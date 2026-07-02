import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    anotarseWaitlistSuscripcion,
    cancelarWaitlistSuscripcion,
    getMisWaitlistSuscripcion,
    getWaitlistSuscripcionStatus,
} from "@/actions/inscripciones";
import * as serverApi from "@/lib/server-api";

vi.mock("@/lib/server-api", () => ({
    serverApi: vi.fn(),
}));

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

const mockServerApi = vi.mocked(serverApi.serverApi);

describe("waitlist suscripcion actions", () => {
    beforeEach(() => {
        mockServerApi.mockReset();
    });

    it("anota en waitlist suscripcion correctamente", async () => {
        mockServerApi.mockResolvedValue({
            ok: true,
            json: vi.fn().mockResolvedValue({
                waitlist_id: "abc",
                posicion: 2,
                estado: "en_espera",
                clase_template_id: "tmpl",
                fecha: "2026-07-10",
            }),
        } as any);

        const result = await anotarseWaitlistSuscripcion("tmpl", "2026-07-10");

        expect(result.success).toBe(true);
        expect(result.data?.waitlist_id).toBe("abc");
        expect(mockServerApi).toHaveBeenCalledWith("/inscripciones/waitlist-suscripcion", {
            method: "POST",
            body: JSON.stringify({ clase_template_id: "tmpl", fecha: "2026-07-10" }),
        });
    });

    it("retorna error de backend al anotar waitlist suscripcion", async () => {
        mockServerApi.mockResolvedValue({
            ok: false,
            json: vi.fn().mockResolvedValue({ detail: "Ya estás anotado" }),
        } as any);

        const result = await anotarseWaitlistSuscripcion("tmpl", "2026-07-10");

        expect(result.error).toBe("Ya estás anotado");
    });

    it("lista waitlist suscripcion y status", async () => {
        mockServerApi
            .mockResolvedValueOnce({
                ok: true,
                json: vi.fn().mockResolvedValue([{ id: "w1" }]),
            } as any)
            .mockResolvedValueOnce({
                ok: true,
                json: vi.fn().mockResolvedValue({
                    id: "w1",
                    estado: "notificado",
                    posicion: 1,
                    expira_at: "2026-07-10T20:00:00Z",
                }),
            } as any);

        const list = await getMisWaitlistSuscripcion();
        const status = await getWaitlistSuscripcionStatus("w1");

        expect(list).toEqual([{ id: "w1" }]);
        expect(status?.estado).toBe("notificado");
    });

    it("cancela waitlist suscripcion correctamente", async () => {
        mockServerApi.mockResolvedValue({ ok: true } as any);

        const result = await cancelarWaitlistSuscripcion("w1");

        expect(result.success).toBe(true);
        expect(mockServerApi).toHaveBeenCalledWith("/inscripciones/waitlist-suscripcion/w1", {
            method: "DELETE",
        });
    });
});
