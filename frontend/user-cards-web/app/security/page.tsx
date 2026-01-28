'use client';

import { useUserStore } from '@/lib/store';
import SecuritySettings from '@/components/security/SecuritySettings';
import { ShieldCheck } from 'lucide-react';

export default function SecurityPage() {
    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-3xl mx-auto">
                <header className="flex items-center gap-3 mb-8">
                    <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                        <ShieldCheck size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Centre de Sécurité</h1>
                        <p className="text-slate-500">Gérez vos limites et la sécurité de toutes vos cartes.</p>
                    </div>
                </header>

                <SecuritySettings />
            </div>
        </div>
    );
}
