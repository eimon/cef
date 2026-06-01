import UsersManagementPage from "@/components/UsersManagementPage";
import { UserRole } from "@/types/api";
import { getUserRole } from "@/lib/auth";
import { redirect } from "next/navigation";

const STAFF_ROLES = [UserRole.ADMIN, UserRole.RECEPCION];

export const dynamic = "force-dynamic";

export default async function PersonalPage() {
    const userRole = await getUserRole();
    if (userRole !== "admin") {
        redirect("/clases");
    }

    return (
        <UsersManagementPage
            title="Personal"
            subtitle="Administradores y recepcionistas."
            visibleRoles={STAFF_ROLES}
            allowedRoles={STAFF_ROLES}
            emptyMessage="No hay administradores ni recepcionistas."
            filteredEmptyMessage="No se encontró personal con los filtros ingresados"
        />
    );
}
