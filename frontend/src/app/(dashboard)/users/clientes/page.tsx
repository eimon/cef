import UsersManagementPage from "@/components/UsersManagementPage";
import { UserRole } from "@/types/api";
import { getUserRole } from "@/lib/auth";

const CLIENT_ROLES = [UserRole.CLIENTE];

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
    const userRole = await getUserRole();
    const editableRoles = userRole === UserRole.ADMIN || userRole === UserRole.RECEPCION ? [UserRole.CLIENTE] : [];

    return (
        <UsersManagementPage
            title="Clientes"
            subtitle="Usuarios registrados como clientes."
            visibleRoles={CLIENT_ROLES}
            allowedRoles={editableRoles}
            emptyMessage="No hay clientes registrados."
            filteredEmptyMessage="No se encontraron clientes con los filtros ingresados"
            showAddButton={false}
            showRoleColumn={false}
        />
    );
}
