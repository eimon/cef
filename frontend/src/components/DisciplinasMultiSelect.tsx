"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { DisciplinaItem } from "@/types/api";

interface DisciplinasMultiSelectProps {
    disciplinas: DisciplinaItem[];
    selected: string[];
    onChange: (names: string[]) => void;
}

export default function DisciplinasMultiSelect({ disciplinas, selected, onChange }: DisciplinasMultiSelectProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const toggle = (nombre: string) => {
        onChange(
            selected.includes(nombre)
                ? selected.filter((d) => d !== nombre)
                : [...selected, nombre]
        );
    };

    const label =
        selected.length === 0
            ? "Seleccionar disciplinas"
            : selected.length === 1
            ? selected[0].charAt(0).toUpperCase() + selected[0].slice(1)
            : `${selected.length} disciplinas seleccionadas`;

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm border transition-all ${
                    selected.length > 0
                        ? "bg-slate-50 border-slate-300 text-slate-800"
                        : "bg-slate-50 border-slate-300 text-slate-400"
                }`}
            >
                <span>{label}</span>
                <ChevronDown size={14} className={`flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="absolute left-0 bottom-full mb-1 z-30 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                    {disciplinas.length === 0 ? (
                        <p className="px-3 py-2.5 text-xs text-slate-400">Cargando disciplinas…</p>
                    ) : (
                        disciplinas.map((d) => {
                            const isSelected = selected.includes(d.nombre);
                            return (
                                <button
                                    key={d.id}
                                    type="button"
                                    onClick={() => toggle(d.nombre)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium transition-colors ${
                                        isSelected
                                            ? "bg-cef-primary/10 text-cef-primary"
                                            : "text-slate-700 hover:bg-slate-50"
                                    }`}
                                >
                                    <span className="capitalize">{d.nombre}</span>
                                    {isSelected && <Check size={13} className="flex-shrink-0" />}
                                </button>
                            );
                        })
                    )}
                </div>
            )}

            {selected.map((nombre) => (
                <input key={nombre} type="hidden" name="disciplinas" value={nombre} />
            ))}
        </div>
    );
}
