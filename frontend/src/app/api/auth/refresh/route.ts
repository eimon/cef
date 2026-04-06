import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const SERVER_API_URL =
    process.env.INTERNAL_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:8000";

const cookieBase = {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
};

/**
 * POST /api/auth/refresh
 *
 * Server-side proxy for token rotation. Called by the axios interceptor when a
 * client-side request receives a 401. Reads the httpOnly refresh_token cookie
 * (inaccessible from browser JS), calls the backend, and sets updated cookies
 * via Set-Cookie headers. Returns { access_token } in the body so the
 * interceptor can immediately retry the failed request.
 */
export async function POST() {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refresh_token")?.value;

    if (!refreshToken) {
        return NextResponse.json({ error: "No refresh token" }, { status: 401 });
    }

    try {
        const res = await fetch(`${SERVER_API_URL}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!res.ok) {
            const response = NextResponse.json({ error: "Sesión expirada" }, { status: 401 });
            response.cookies.delete("access_token");
            response.cookies.delete("refresh_token");
            return response;
        }

        const { access_token, refresh_token } = await res.json();

        const response = NextResponse.json({ access_token });
        response.cookies.set("access_token", access_token, {
            ...cookieBase,
            httpOnly: false,
            maxAge: 30 * 60,
        });
        response.cookies.set("refresh_token", refresh_token, {
            ...cookieBase,
            httpOnly: true,
            maxAge: 60 * 60 * 24 * 60,
        });

        return response;
    } catch {
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
