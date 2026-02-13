'use client';

import { useEffect, useState } from 'react';
import { Store, Check, RefreshCw, Search, MapPin, AlertTriangle } from 'lucide-react';
import { getAvailableMerchants } from '@/lib/api-client';
import type { MerchantApi } from '@/lib/api-client';
import type { SelectedMerchant } from '@/lib/store';

interface MerchantSelectorProps {
    selectedMerchant: SelectedMerchant | null;
    onSelect: (merchant: SelectedMerchant) => void;
}

const getErrorMessage = (error: unknown): string => {
    if (typeof error === 'object' && error !== null) {
        const maybeError = error as {
            response?: { data?: { error?: string } };
            message?: string;
        };
        if (maybeError.response?.data?.error) {
            return maybeError.response.data.error;
        }
        if (maybeError.message) {
            return maybeError.message;
        }
    }
    return 'Impossible de charger les marchands';
};

export default function MerchantSelector({ selectedMerchant, onSelect }: MerchantSelectorProps) {
    const [merchants, setMerchants] = useState<MerchantApi[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchMerchants = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAvailableMerchants();
            const merchantsList = Array.isArray(data?.merchants) ? data.merchants : [];
            setMerchants(merchantsList.filter((merchant): merchant is MerchantApi => typeof merchant?.id === 'string'));
        } catch (err: unknown) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMerchants(); }, []);

    const filtered = merchants.filter((m) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        const name = (m.displayName || m.username || '').toLowerCase();
        const terminalName = (m.terminals?.[0]?.merchantName || '').toLowerCase();
        const location = (m.terminals?.[0]?.locationName || '').toLowerCase();
        return name.includes(term) || terminalName.includes(term) || location.includes(term);
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center py-6">
                <div className="h-5 w-5 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                <span className="ml-3 text-sm text-slate-400">Chargement des marchands...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-4">
                <AlertTriangle size={20} className="mx-auto mb-2 text-amber-400" />
                <p className="text-sm text-amber-300 mb-2">{error}</p>
                <button onClick={fetchMerchants} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mx-auto">
                    <RefreshCw size={12} /> Réessayer
                </button>
            </div>
        );
    }

    if (merchants.length === 0) {
        return (
            <div className="text-center py-4">
                <Store size={20} className="mx-auto mb-2 text-slate-500" />
                <p className="text-sm text-slate-400">Aucun marchand disponible</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sélectionner un marchand</h4>
                <button onClick={fetchMerchants} className="text-slate-500 hover:text-slate-300 transition">
                    <RefreshCw size={14} />
                </button>
            </div>

            {merchants.length > 3 && (
                <div className="relative mb-2">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Rechercher un marchand..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-black/30 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                    />
                </div>
            )}

            <div className="grid gap-2 max-h-[200px] overflow-y-auto pr-1">
                {filtered.map((merchant) => {
                    const terminal = merchant.terminals?.[0];
                    const merchantName = terminal?.merchantName || merchant.displayName || merchant.username || 'Merchant';
                    const location = terminal?.locationName || terminal?.city || '';
                    const mcc = terminal?.mcc || '5411';
                    const isSelected = selectedMerchant?.id === merchant.id;

                    return (
                        <button
                            key={merchant.id}
                            onClick={() => onSelect({
                                id: merchant.id,
                                displayName: merchant.displayName || merchant.username || 'Merchant',
                                merchantName,
                                mcc,
                                terminalId: terminal?.terminalId || null,
                                locationName: terminal?.locationName || null,
                                city: terminal?.city || null,
                            })}
                            className={`
                                w-full text-left p-3 rounded-xl border transition-all duration-200
                                ${isSelected
                                    ? 'border-purple-500/40 bg-purple-500/10 ring-1 ring-purple-500/30 shadow-[0_0_15px_rgba(139,92,246,0.1)]'
                                    : 'border-white/10 bg-slate-800/30 hover:bg-white/5 hover:scale-[1.01]'
                                }
                            `}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Store size={18} className={isSelected ? 'text-purple-400' : 'text-slate-400'} />
                                    <div>
                                        <span className="text-sm font-medium text-white">{merchantName}</span>
                                        {location && (
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <MapPin size={10} className="text-slate-500" />
                                                <span className="text-xs text-slate-500">{location}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-500">MCC {mcc}</span>
                                    {isSelected && <Check size={14} className="text-purple-400" />}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
