import UsersManagementPage from "@/components/UsersManagementPage";
import { UserRole } from "@/types/api";

const STAFF_ROLES = [UserRole.ADMIN, UserRole.RECEPCION];

export const dynamic = "force-dynamic";

export default function PersonalPage() {
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
