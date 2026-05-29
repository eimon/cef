import ForgotPasswordForm from "@/components/ForgotPasswordForm";

export const dynamic = "force-dynamic";

export default function Page() {
    return (
        <div className="mx-auto max-w-lg p-6">
            <ForgotPasswordForm />
        </div>
    );
}
