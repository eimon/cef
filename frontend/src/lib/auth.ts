import { cookies } from "next/headers";
import { jwtVerify } from "jose";

async function getJwtPayload() {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    const secret = process.env.JWT_SECRET_KEY;
    if (!token || !secret) return null;
    try {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
        return payload;
    } catch {
        return null;
    }
}

export async function getUserRole(): Promise<string | null> {
    const payload = await getJwtPayload();
    return (payload?.role as string) ?? null;
}

export async function getUserId(): Promise<string | null> {
    const payload = await getJwtPayload();
    return (payload?.sub as string) ?? null;
}
