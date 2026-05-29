import { getUsers } from "@/actions/users";
import { UserRole } from "@/types/api";
import UsersTable from "@/components/UsersTable";
import AddUserDialog from "@/components/AddUserDialog";

const CLIENT_ROLES: UserRole[] = [];

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
    const allUsers = await getUsers();
    const clientes = allUsers.filter(u => u.role === UserRole.CLIENTE);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
                    <p className="text-sm text-slate-400 mt-1">Usuarios registrados como clientes.</p>
                </div>
                <AddUserDialog />
            </div>
            <UsersTable
                users={clientes}
                allowedRoles={CLIENT_ROLES}
                emptyMessage="No hay clientes registrados."
            />
        </div>
    );
}
