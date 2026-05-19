import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export async function getUserRole(): Promise<string | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    const secret = process.env.JWT_SECRET_KEY;
    if (!token || !secret) return null;
    try {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
        return (payload.role as string) ?? null;
    } catch {
        return null;
    }
}
