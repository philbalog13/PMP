'use client';

import { useUserStore } from '@/lib/store';
import Link from 'next/link';
import Card3D from '@/components/card/Card3D';

export default function CardsPage() {
    const { cards } = useUserStore();

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-6xl mx-auto">
                <header className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">Mes Cartes</h1>
                    <Link
                        href="/cards/new"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
                    >
                        + Nouvelle Carte
                    </Link>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cards.map((card) => (
                        <Link key={card.id} href={`/cards/${card.id}`} className="block group">
                            <div className="transform group-hover:-translate-y-1 transition duration-300">
                                <Card3D card={card} />
                            </div>
                            <div className="mt-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-slate-900">{card.scheme} {card.type}</span>
                                    <span className={`text-xs px-2 py-1 rounded-full ${card.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {card.status}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                    {cards.length === 0 && (
                        <div className="col-span-full py-20 text-center text-slate-500">
                            Aucune carte disponible. Créez-en une nouvelle !
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
