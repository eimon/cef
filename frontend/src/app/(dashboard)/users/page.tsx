import { getUsers } from "@/actions/users";
import UsersManager from "@/components/UsersManager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
    const users = await getUsers();

    return (
        <div className="space-y-6">
            <UsersManager initialUsers={users} />
        </div>
    );
}
