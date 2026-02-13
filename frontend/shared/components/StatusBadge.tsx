'use client';

import { CheckCircle2, Clock, RotateCcw, XCircle } from 'lucide-react';
import { mapStatus } from '../lib/formatting';

interface StatusBadgeProps {
    status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
    const mapped = mapStatus(status);

    if (mapped === 'approved') {
        return (
            <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full flex items-center gap-1">
                <CheckCircle2 size={12} /> Approuvée
            </span>
        );
    }
    if (mapped === 'declined') {
        return (
            <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full flex items-center gap-1">
                <XCircle size={12} /> Refusée
            </span>
        );
    }
    if (mapped === 'voided') {
        return (
            <span className="px-2 py-1 bg-slate-500/20 text-slate-300 text-xs rounded-full flex items-center gap-1">
                <RotateCcw size={12} /> Annulée
            </span>
        );
    }
    return (
        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full flex items-center gap-1">
            <Clock size={12} /> En attente
        </span>
    );
}
