export function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isEmptyOrValidEmail(value: string): boolean {
    return value.trim().length === 0 || isValidEmail(value);
}
