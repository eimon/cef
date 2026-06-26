import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { buildLoginUrlWithRedirect } from "@/lib/redirect";

const cookieBase = {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
};

function getServerApiUrl(): string {
    const internalUrl = process.env.INTERNAL_API_URL?.trim();
    if (internalUrl) return internalUrl.replace(/\/$/, "");

    const publicUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
    const isLocalhostUrl = publicUrl && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(publicUrl);
    if (publicUrl && !isLocalhostUrl) return publicUrl.replace(/\/$/, "");

    return "http://cef_api:8000";
}

async function refreshSession(refreshToken: string) {
    try {
        const res = await fetch(`${getServerApiUrl()}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: refreshToken }),
            cache: "no-store",
        });

        if (!res.ok) return null;
        return res.json() as Promise<{ access_token: string; refresh_token: string }>;
    } catch {
        return null;
    }
}

export async function middleware(request: NextRequest) {
    const token = request.cookies.get("access_token")?.value;
    const refreshToken = request.cookies.get("refresh_token")?.value;
    const secret = process.env.JWT_SECRET_KEY;
    const pathname = request.nextUrl.pathname;

    const isPublicPath =
        pathname === "/auth/login" ||
        pathname.startsWith("/auth/") ||
        pathname.match(/\.(ico|svg|png|jpg|jpeg)$/) ||
        pathname.startsWith("/_next");

    if (isPublicPath) {
        return NextResponse.next();
    }

    const redirectToLogin = () => {
        const loginPath = buildLoginUrlWithRedirect(pathname, request.nextUrl.search);
        const res = NextResponse.redirect(new URL(loginPath, request.url));
        res.cookies.delete("access_token");
        res.cookies.delete("refresh_token");
        return res;
    };

    const continueWithTokens = (tokens: { access_token: string; refresh_token: string }) => {
        const requestHeaders = new Headers(request.headers);
        const passthroughCookies = request.cookies
            .getAll()
            .filter(({ name }) => name !== "access_token" && name !== "refresh_token")
            .map(({ name, value }) => `${name}=${value}`);

        requestHeaders.set(
            "cookie",
            [
                ...passthroughCookies,
                `access_token=${tokens.access_token}`,
                `refresh_token=${tokens.refresh_token}`,
            ].join("; ")
        );

        const res = NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });
        res.cookies.set("access_token", tokens.access_token, {
            ...cookieBase,
            httpOnly: false,
            maxAge: 30 * 60,
        });
        res.cookies.set("refresh_token", tokens.refresh_token, {
            ...cookieBase,
            httpOnly: true,
            maxAge: 60 * 60 * 24 * 60,
        });
        return res;
    };

    const tryRefreshOrRedirect = async () => {
        if (!refreshToken) return redirectToLogin();

        const newTokens = await refreshSession(refreshToken);
        if (!newTokens) return redirectToLogin();

        return continueWithTokens(newTokens);
    };

    if (!token) {
        return tryRefreshOrRedirect();
    }

    try {
        if (!secret) throw new Error("JWT_SECRET_KEY not defined");
        await jwtVerify(token, new TextEncoder().encode(secret));
        return NextResponse.next();
    } catch {
        return tryRefreshOrRedirect();
    }
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
