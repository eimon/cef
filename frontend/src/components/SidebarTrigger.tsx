"use client";

import { Menu } from "lucide-react";
import { useSidebar } from "@/context/SidebarContext";

export default function SidebarTrigger() {
    const { toggle } = useSidebar();

    return (
        <button
            type="button"
            onClick={toggle}
            className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors lg:hidden"
            aria-label="Abrir menú"
        >
            <Menu size={20} />
        </button>
    );
}
