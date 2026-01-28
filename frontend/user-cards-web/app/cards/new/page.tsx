'use client';

import CardGenerator from '@/components/card/CardGenerator';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NewCardPage() {
    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-2xl mx-auto">
                <Link href="/cards" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-6 transition">
                    <ArrowLeft size={20} />
                    Retour aux cartes
                </Link>

                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="bg-slate-900 p-8 text-white">
                        <h1 className="text-2xl font-bold mb-2">Configurer votre Carte</h1>
                        <p className="text-slate-300">Choisissez les caractéristiques de votre carte virtuelle pédagogique.</p>
                    </div>
                    <div className="p-8">
                        <CardGenerator />
                    </div>
                </div>
            </div>
        </div>
    );
}
