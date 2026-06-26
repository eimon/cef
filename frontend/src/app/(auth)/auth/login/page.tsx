import LoginForm from "@/components/LoginForm";
import { sanitizeRedirectTarget } from "@/lib/redirect";

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ redirect?: string }>;
}) {
    const params = await searchParams;
    const redirectTo = sanitizeRedirectTarget(params.redirect) ?? "/";

    return <LoginForm redirectTo={redirectTo} />;
}
