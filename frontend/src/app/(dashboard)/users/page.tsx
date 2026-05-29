import { getUsers } from "@/actions/users";
import UsersTable from "@/components/UsersTable";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
    const users = await getUsers();

    return (
        <div className="space-y-6">
            <UsersTable users={users} />
        </div>
    );
}
