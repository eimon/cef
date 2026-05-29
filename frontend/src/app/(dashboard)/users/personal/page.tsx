import { getUsers } from "@/actions/users";
import { UserRole } from "@/types/api";
import UsersTable from "@/components/UsersTable";
import AddUserDialog from "@/components/AddUserDialog";

const STAFF_ROLES = [UserRole.ADMIN, UserRole.RECEPCION];

export const dynamic = "force-dynamic";

export default async function PersonalPage() {
    const allUsers = await getUsers();
    const staff = allUsers.filter(u => u.role === UserRole.ADMIN || u.role === UserRole.RECEPCION);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Personal</h1>
                    <p className="text-sm text-slate-400 mt-1">Administradores y recepcionistas.</p>
                </div>
                <AddUserDialog />
            </div>
            <UsersTable
                users={staff}
                allowedRoles={STAFF_ROLES}
                emptyMessage="No hay administradores ni recepcionistas."
            />
        </div>
    );
}
