"use client";

import { useState, useEffect, useCallback } from "react";
import { getDisciplinaPrecios } from "@/actions/disciplinas";
import { getSenaMinima, getPlazoPago, getDiasAvisoVencimiento } from "@/actions/config";
import { PrecioDisciplina } from "@/types/api";
import PreciosTable from "@/components/PreciosTable";
import SenaMinimaCard from "@/components/SenaMinimaCard";
import PlazosCard from "@/components/PlazosCard";

type Tab = "precios" | "sena" | "suscripciones";

export default function PreciosPage() {
    const [activeTab, setActiveTab] = useState<Tab>("precios");
    const [precios, setPrecios] = useState<PrecioDisciplina[]>([]);
    const [senaMinima, setSenaMinima] = useState<string>("0");
    const [plazoPago, setPlazoPago] = useState<string>("10");
    const [diasAviso, setDiasAviso] = useState<string>("1");
    const [isLoading, setIsLoading] = useState(true);

    const refresh = useCallback(async () => {
        try {
            const [dataPrecios, dataSena, dataPlazo, dataDiasAviso] = await Promise.all([
                getDisciplinaPrecios(),
                getSenaMinima(),
                getPlazoPago(),
                getDiasAvisoVencimiento(),
            ]);
            setPrecios(dataPrecios);
            setSenaMinima(dataSena);
            setPlazoPago(dataPlazo);
            setDiasAviso(dataDiasAviso);
        } catch {
            setPrecios([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const tabs: { id: Tab; label: string }[] = [
        { id: "precios", label: "Configuración de precios" },
        { id: "sena", label: "Porcentaje mínimo de seña" },
        { id: "suscripciones", label: "Plazos de suscripción" },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Precios</h1>
                <p className="text-sm text-slate-400 mt-1">Administrá los precios del sistema.</p>
            </div>

            <div className="flex gap-1 border-b border-slate-200">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
                            activeTab === tab.id
                                ? "border-cef-primary text-cef-primary"
                                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="text-center py-12 glass rounded-xl">
                    <p className="text-slate-400 text-sm">Cargando...</p>
                </div>
            ) : (
                <>
                    {activeTab === "precios" && (
                        <PreciosTable precios={precios} onSuccess={refresh} />
                    )}
                    {activeTab === "sena" && (
                        <SenaMinimaCard valorActual={senaMinima} onSuccess={refresh} />
                    )}
                    {activeTab === "suscripciones" && (
                        <PlazosCard plazoPago={plazoPago} diasAviso={diasAviso} onSuccess={refresh} />
                    )}
                </>
            )}
        </div>
    );
}
