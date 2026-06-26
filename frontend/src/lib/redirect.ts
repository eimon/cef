export function sanitizeRedirectTarget(value: string | null | undefined): string | null {
    if (!value) return null;

    let decoded: string;
    try {
        decoded = decodeURIComponent(value);
    } catch {
        return null;
    }

    if (!decoded.startsWith("/")) return null;
    if (decoded.startsWith("//")) return null;
    if (decoded.includes("\\")) return null;
    if (/^\/[a-zA-Z][a-zA-Z0-9+.-]*:/.test(decoded)) return null;

    return decoded;
}

export function buildLoginUrlWithRedirect(pathname: string, search: string): string {
    const target = `${pathname}${search}`;
    return `/auth/login?redirect=${encodeURIComponent(target)}`;
}
