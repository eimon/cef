"use client";

import { Menu } from "lucide-react";
import { useSidebar } from "@/context/SidebarContext";

export default function SidebarTrigger() {
    const { toggle } = useSidebar();

    return (
        <button
            type="button"
            onClick={toggle}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors lg:hidden"
            aria-label="Abrir menú"
        >
            <Menu size={20} />
        </button>
    );
}
