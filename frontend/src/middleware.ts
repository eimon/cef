import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(request: NextRequest) {
    const token = request.cookies.get("access_token")?.value;
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
        const res = NextResponse.redirect(new URL(`/auth/login`, request.url));
        res.cookies.delete("access_token");
        res.cookies.delete("refresh_token");
        return res;
    };

    if (!token) {
        return redirectToLogin();
    }

    try {
        if (!secret) throw new Error("JWT_SECRET_KEY not defined");
        await jwtVerify(token, new TextEncoder().encode(secret));
        return NextResponse.next();
    } catch {
        return redirectToLogin();
    }
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
