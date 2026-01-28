import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
    }).format(amount);
}

export function maskPAN(pan: string): string {
    if (pan.length < 13) return pan;
    return `${pan.substring(0, 4)}${'*'.repeat(pan.length - 8)}${pan.substring(pan.length - 4)}`;
}

export function generateSTAN(): string {
    return Date.now().toString().slice(-6);
}

export function formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'medium',
    }).format(date);
}
