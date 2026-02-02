'use client';

import { Settings } from 'lucide-react';

export default function ConfigPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-slate-700/30 rounded-xl border border-white/10 text-slate-300">
                    <Settings size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold font-heading text-white">Configuration</h1>
                    <p className="text-slate-400 text-sm">Network and Policy settings.</p>
                </div>
            </div>

            <div className="glass-card p-8 rounded-xl flex items-center justify-center h-64 border-dashed border-2 border-white/10">
                <div className="text-center text-slate-500">
                    <Settings size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Configuration panel is under construction.</p>
                </div>
            </div>
        </div>
    );
}
