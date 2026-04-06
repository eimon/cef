import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatPrice(value: number | string): string {
    return Math.round(Number(value)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatPriceCompact(value: number | string): string {
    const n = Math.round(Number(value));
    if (n >= 1_000_000) return `${Math.round(n / 100_000) / 10}M`;
    if (n >= 1_000) return `${Math.round(n / 100) / 10}k`;
    return n.toString();
}
