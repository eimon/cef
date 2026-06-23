import { redirect } from "next/navigation";

import SimulacionesView from "@/components/SimulacionesView";
import { getUserRole } from "@/lib/auth";
import { UserRole } from "@/types/api";

export const dynamic = "force-dynamic";

export default async function SimulacionesPage() {
    const userRole = await getUserRole();
    if (userRole !== UserRole.ADMIN) {
        redirect("/");
    }

    return <SimulacionesView />;
}
