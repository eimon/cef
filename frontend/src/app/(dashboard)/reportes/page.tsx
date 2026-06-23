import { redirect } from "next/navigation";

import ReportsView from "@/components/ReportsView";
import { getUserRole } from "@/lib/auth";
import { UserRole } from "@/types/api";

export const dynamic = "force-dynamic";

export default async function ReportesPage() {
    const userRole = await getUserRole();
    if (userRole !== UserRole.ADMIN) {
        redirect("/");
    }

    return <ReportsView />;
}
