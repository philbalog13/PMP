'use client';

import { Search, Filter, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export default function AnalyzePage() {
    return (
        <div className="min-h-screen bg-slate-950 p-8 text-white">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                        <Search size={32} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-cyan-400">Log Analyzer</h1>
                        <p className="text-slate-400">Deep dive into transaction logs</p>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="flex gap-4">
                    <div className="flex-1 bg-slate-900 border border-white/10 rounded-xl flex items-center px-4">
                        <Search className="text-slate-500" />
                        <input className="bg-transparent p-4 w-full outline-none" placeholder="Search by Trace ID, PAN, or Response Code..." />
                    </div>
                    <button className="px-6 bg-slate-800 hover:bg-slate-700 rounded-xl border border-white/10 flex items-center gap-2 transition">
                        <Filter size={20} /> Filters
                    </button>
                </div>

                {/* Results */}
                <div className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-900 text-slate-400 text-sm uppercase">
                            <tr>
                                <th className="p-4">Time</th>
                                <th className="p-4">Service</th>
                                <th className="p-4">Level</th>
                                <th className="p-4">Message</th>
                                <th className="p-4">Trace ID</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            <LogRow time="10:45:22" service="HSM" level="INFO" msg="Key generate request (ZMK)" trace="TR-8821" />
                            <LogRow time="10:45:23" service="TPE" level="ERROR" msg="Connection timeout: Host unreachable" trace="TR-8822" isError />
                            <LogRow time="10:45:25" service="CORE" level="INFO" msg="Transaction approved: 4111********1111" trace="TR-8823" />
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function LogRow({ time, service, level, msg, trace, isError }: any) {
    return (
        <tr className="hover:bg-white/5 transition">
            <td className="p-4 font-mono text-slate-400 text-sm flex items-center gap-2">
                <Clock size={14} /> {time}
            </td>
            <td className="p-4"><span className="bg-slate-800 px-2 py-1 rounded text-xs font-bold">{service}</span></td>
            <td className="p-4">
                {isError ?
                    <span className="text-red-400 flex items-center gap-1 text-xs font-bold"><AlertCircle size={14} /> ERROR</span> :
                    <span className="text-green-400 flex items-center gap-1 text-xs font-bold"><CheckCircle size={14} /> INFO</span>
                }
            </td>
            <td className="p-4 text-slate-300">{msg}</td>
            <td className="p-4 font-mono text-slate-500 text-xs">{trace}</td>
        </tr>
    );
}
