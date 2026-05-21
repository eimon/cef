import ResetPasswordForm from "@/components/ResetPasswordForm";

export default async function Page({
    searchParams,
}: {
    searchParams: Promise<{ token?: string }>;
}) {
    const params = await searchParams;
    const token = params.token || "";

    return (
        <div className="mx-auto max-w-lg p-6">
            <ResetPasswordForm token={token} />
        </div>
    );
}
