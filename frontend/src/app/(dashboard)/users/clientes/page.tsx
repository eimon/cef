import UsersManagementPage from "@/components/UsersManagementPage";
import { UserRole } from "@/types/api";

const CLIENT_ROLES = [UserRole.CLIENTE];
const EDITABLE_CLIENT_ROLES: UserRole[] = [];

export const dynamic = "force-dynamic";

export default function ClientesPage() {
    return (
        <UsersManagementPage
            title="Clientes"
            subtitle="Usuarios registrados como clientes."
            visibleRoles={CLIENT_ROLES}
            allowedRoles={EDITABLE_CLIENT_ROLES}
            emptyMessage="No hay clientes registrados."
            filteredEmptyMessage="No se encontraron clientes con los filtros ingresados"
        />
    );
}
