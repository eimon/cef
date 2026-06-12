import { getMisPagos } from "@/actions/pagos";
import MisPagosView from "@/components/MisPagosView";
import { getUserRole } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function MisPagosPage() {
    const userRole = await getUserRole();
    if (userRole !== "cliente") redirect("/");

    const pagos = await getMisPagos();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-800">Mis Pagos</h1>
                <p className="mt-1 text-sm text-slate-400">Listado de tus pagos confirmados.</p>
            </div>

            <MisPagosView pagos={pagos} />
        </div>
    );
}
