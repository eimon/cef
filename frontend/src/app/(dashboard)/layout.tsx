import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { SidebarProvider } from "@/context/SidebarContext";
import { getUserRole } from "@/lib/auth";

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
