'use client';

import { use } from 'react';

// Handle dynamic router params
import { useUserStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import Card3D from '@/components/card/Card3D';
import QRCodeDisplay from '@/components/card/QRCodeDisplay';
import SecuritySettings from '@/components/security/SecuritySettings';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CardDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const card = useUserStore(state => state.cards.find(c => c.id === id));

    if (!card) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Carte introuvable</h2>
                    <button onClick={() => router.push('/cards')} className="text-blue-600 underline">Retour</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-6xl mx-auto">
                <Link href="/cards" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-6 transition">
                    <ArrowLeft size={20} />
                    Retour
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Col: Visuals */}
                    <div className="space-y-6">
                        <Card3D card={card} showDetails={true} />
                        <QRCodeDisplay data={`${card.pan}|${card.expiryDate}|${card.cvv}`} label="Payer sans contact" />
                    </div>

                    {/* Right Col: Settings */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">{card.holder}</h2>
                            <p className="font-mono text-slate-500">{card.panFormatted}</p>
                            <div className="mt-4 flex gap-4 text-sm">
                                <div>
                                    <span className="block text-slate-500">Solde Actuel</span>
                                    <span className="block text-xl font-bold text-slate-900">{card.balance.toFixed(2)} €</span>
                                </div>
                                <div>
                                    <span className="block text-slate-500">Statut</span>
                                    <span className="block text-xl font-bold text-green-600">{card.status}</span>
                                </div>
                            </div>
                        </div>

                        <SecuritySettings />
                    </div>
                </div>
            </div>
        </div>
    );
}
