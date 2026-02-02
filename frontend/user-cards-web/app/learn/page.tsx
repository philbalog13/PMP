'use client';

import Link from 'next/link';
import { BookOpen, CheckCircle, Clock, ChevronRight } from 'lucide-react';

const walletWorkshops = [
    { id: '3ds-flow', title: '3D-Secure 2.0', description: 'Frictionless vs Challenge flows in e-commerce.', difficulty: 'beginner', durationMinutes: 15 },
    { id: 'cvv-validation', title: 'CVV/CVC Logic', description: 'How the 3-digit code verifies card presence.', difficulty: 'intermediate', durationMinutes: 10 },
    { id: 'fraud-patterns', title: 'Fraud Patterns', description: 'Recognizing common fraud scenarios.', difficulty: 'beginner', durationMinutes: 20 },
];

function getWorkshopProgress(workshopId: string): number {
    if (typeof window === 'undefined') return 0;
    const stored = window.localStorage.getItem(`workshop_progress_${workshopId}`);
    return stored ? parseInt(stored, 10) : 0;
}

export default function WalletLearnDashboard() {
    return (
        <div className="min-h-screen bg-slate-950 p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Security Education</h1>
                    <p className="text-slate-400 mt-2">Protect your financial assets by understanding how payments work.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {walletWorkshops.map(workshop => {
                        const progress = getWorkshopProgress(workshop.id);
                        const isDone = progress >= 100;

                        return (
                            <Link
                                key={workshop.id}
                                href={`/learn/${workshop.id}`}
                                className="group relative bg-slate-900 border border-white/5 rounded-2xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                            >
                                {isDone && (
                                    <div className="absolute top-4 right-4 text-green-500">
                                        <CheckCircle size={24} />
                                    </div>
                                )}

                                <div className="flex items-start justify-between mb-4">
                                    <div className={`p-3 rounded-xl ${workshop.difficulty === 'beginner' ? 'bg-purple-500/10 text-purple-400' :
                                        workshop.difficulty === 'intermediate' ? 'bg-blue-500/10 text-blue-400' :
                                            'bg-amber-500/10 text-amber-400'
                                        }`}>
                                        <BookOpen size={24} />
                                    </div>
                                    <div className="flex items-center gap-1 text-slate-400 text-xs font-medium bg-slate-800 px-2 py-1 rounded-full">
                                        <Clock size={12} />
                                        {workshop.durationMinutes} min
                                    </div>
                                </div>

                                <h2 className="text-xl font-bold text-white mb-2 group-hover:text-purple-400 transition">
                                    {workshop.title}
                                </h2>
                                <p className="text-slate-400 text-sm mb-6 line-clamp-2">
                                    {workshop.description}
                                </p>

                                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${isDone ? 'bg-green-500' : 'bg-purple-500'}`}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <div className="mt-2 flex justify-between text-xs text-slate-500 font-medium">
                                    <span>{progress}% Complete</span>
                                    <span className="group-hover:translate-x-1 transition flex items-center gap-1 text-slate-400">
                                        {progress === 0 ? 'Start' : 'Continue'} <ChevronRight size={12} />
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
