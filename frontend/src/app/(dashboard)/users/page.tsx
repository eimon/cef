import { getUsers } from "@/actions/users";
import { getUserRole } from "@/lib/auth";
import UsersDashboard from "@/components/UsersDashboard";

export default async function UsersPage() {
    const [users, userRole] = await Promise.all([getUsers(), getUserRole()]);

    return <UsersDashboard users={users} userRole={userRole} />;
}
