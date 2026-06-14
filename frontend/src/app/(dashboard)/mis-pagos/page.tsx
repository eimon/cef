import { getDeudasPendientes, getMisPagos, getRenovacionesPendientes } from "@/actions/pagos";
import MisPagosView from "@/components/MisPagosView";
import { getUserRole } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function MisPagosPage() {
    const userRole = await getUserRole();
    if (userRole !== "cliente") redirect("/");

    const [pagos, renovacionesPendientes, deudasPendientes] = await Promise.all([
        getMisPagos(),
        getRenovacionesPendientes(),
        getDeudasPendientes(),
    ]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-800">Mis Pagos</h1>
            </div>

            <MisPagosView
                pagos={pagos}
                renovacionesPendientes={renovacionesPendientes}
                deudasPendientes={deudasPendientes}
            />
        </div>
    );
}
