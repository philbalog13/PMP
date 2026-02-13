'use client';

import { BarChart, Users, Server, Activity, type LucideIcon } from 'lucide-react';

export default function StatsPage() {
    return (
        <div className="min-h-screen bg-slate-950 p-8 text-white">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                        <BarChart size={32} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-purple-400">Platform Statistics</h1>
                        <p className="text-slate-400">Global system performance metrics</p>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-6">
                    <StatCard icon={Activity} label="Total Transactions" value="1.2M" sub="+12% this week" color="text-blue-400" />
                    <StatCard icon={Server} label="Uptime" value="99.98%" sub="Last 30 days" color="text-green-400" />
                    <StatCard icon={Users} label="Active Students" value="342" sub="Currently online" color="text-amber-400" />
                    <StatCard icon={BarChart} label="Avg Response" value="45ms" sub="Global latency" color="text-purple-400" />
                </div>

                <div className="grid grid-cols-2 gap-6 h-80">
                    <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 flex items-center justify-center text-slate-500">
                        [Transaction Volume Chart Placeholder]
                    </div>
                    <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 flex items-center justify-center text-slate-500">
                        [System Load Heatmap Placeholder]
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: LucideIcon; label: string; value: string; sub: string; color: string }) {
    return (
        <div className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl hover:bg-slate-900 transition">
            <div className={`p-3 bg-slate-950 rounded-xl w-fit mb-4 ${color}`}>
                <Icon size={24} />
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{value}</h3>
            <p className="text-slate-300 font-medium">{label}</p>
            <p className="text-slate-500 text-sm mt-2">{sub}</p>
        </div>
    );
}
