import { getMisClasesIndividuales, getMisSuscripciones } from "@/actions/mis_clases";
import { getMisWaitlist } from "@/actions/inscripciones";
import MisClasesView from "@/components/MisClasesView";

export default async function MisClasesPage({
    searchParams,
}: {
    searchParams: Promise<{ waitlist?: string }>;
}) {
    const [params, individuales, suscripciones, waitlistEntries] = await Promise.all([
        searchParams,
        getMisClasesIndividuales(),
        getMisSuscripciones(),
        getMisWaitlist(),
    ]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Mis Clases</h1>
                <p className="text-sm text-slate-400 mt-1">Tus inscripciones individuales y suscripciones.</p>
            </div>

            <MisClasesView
                individuales={individuales}
                suscripciones={suscripciones}
                waitlistEntries={waitlistEntries}
                highlightWaitlistId={params.waitlist || null}
            />
        </div>
    );
}
