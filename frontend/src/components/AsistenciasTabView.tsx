"use client";

import { useState } from "react";
import { KeyRound, ScanLine } from "lucide-react";
import MarcarAsistenciaView from "./MarcarAsistenciaView";
import EscanearQRView from "./EscanearQRView";

type Tab = "dni" | "qr";

export default function AsistenciasTabView() {
    const [tab, setTab] = useState<Tab>("dni");

    return (
        <div>
            <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 w-fit">
                <button
                    onClick={() => setTab("dni")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        tab === "dni"
                            ? "bg-white text-slate-800 shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                    }`}
                >
                    <KeyRound size={14} />
                    Ingresar DNI
                </button>
                <button
                    onClick={() => setTab("qr")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        tab === "qr"
                            ? "bg-white text-slate-800 shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                    }`}
                >
                    <ScanLine size={14} />
                    Escanear QR
                </button>
            </div>
            {tab === "dni" ? <MarcarAsistenciaView /> : <EscanearQRView />}
        </div>
    );
}
