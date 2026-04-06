import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { SidebarProvider } from "@/context/SidebarContext";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

async function getUserRole(): Promise<string | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    const secret = process.env.JWT_SECRET_KEY;
    if (!token || !secret) return null;
    try {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
        return (payload.role as string) ?? null;
    } catch {
        return null;
    }
}

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const userRole = await getUserRole();

    return (
        <SidebarProvider>
            <div className="min-h-screen flex">
                <Sidebar userRole={userRole} />
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    <Navbar />
                    <main className="max-w-7xl w-full mx-auto py-6 px-4 sm:px-6 lg:px-8 flex-1 overflow-y-auto">
                        {children}
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}
