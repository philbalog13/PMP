'use client';

import Link from 'next/link';
import {
  Key,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Server,
  Cpu,
  RefreshCw,
  Zap,
  Calculator
} from 'lucide-react';

export default function Home() {
  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white">System Overview</h1>
          <p className="text-slate-400 mt-2">Hardware Security Module  -  Model PMP-9000-v2</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-semibold border border-green-500/20 animate-pulse">
            SYSTEM ONLINE
          </span>
          <span className="text-slate-500 text-sm font-mono">FW: 4.2.0-secure</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/10 rounded-bl-full transition-all group-hover:scale-110" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4 text-blue-400">
              <Key size={20} />
              <span className="text-sm font-semibold uppercase tracking-wider">Keys Loaded</span>
            </div>
            <div className="text-3xl font-bold font-heading text-white">2,548</div>
            <div className="text-xs text-slate-500 mt-2">LMK Active  -  98% Integrity</div>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-green-500/10 rounded-bl-full transition-all group-hover:scale-110" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4 text-green-400">
              <ShieldCheck size={20} />
              <span className="text-sm font-semibold uppercase tracking-wider">Security State</span>
            </div>
            <div className="text-3xl font-bold font-heading text-white">SECURE</div>
            <div className="text-xs text-slate-500 mt-2">No Tamper Events (30d)</div>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-purple-500/10 rounded-bl-full transition-all group-hover:scale-110" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4 text-purple-400">
              <Activity size={20} />
              <span className="text-sm font-semibold uppercase tracking-wider">Throughput</span>
            </div>
            <div className="text-3xl font-bold font-heading text-white">850 tps</div>
            <div className="text-xs text-slate-500 mt-2">Peak: 1,200 tps</div>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-amber-500/10 rounded-bl-full transition-all group-hover:scale-110" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4 text-amber-400">
              <Cpu size={20} />
              <span className="text-sm font-semibold uppercase tracking-wider">Crypto Load</span>
            </div>
            <div className="text-3xl font-bold font-heading text-white">24%</div>
            <div className="text-xs text-slate-500 mt-2">Temp: 42C  -  Fan: 30%</div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Col: Activity & Alerts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity size={18} className="text-blue-500" />
                Live Operations
              </h2>
              <button className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-full transition text-slate-300">
                View All
              </button>
            </div>

            <div className="space-y-4">
              {[
                { time: '10:42:05', op: 'PIN_VERIFY', src: 'TERM-001', status: 'OK', lat: '12ms' },
                { time: '10:42:02', op: 'MAC_GEN', src: 'SWITCH-01', status: 'OK', lat: '8ms' },
                { time: '10:41:58', op: 'KEY_EXPORT', src: 'CMS-ADMIN', status: 'OK', lat: '45ms' },
                { time: '10:41:45', op: 'PIN_TRANSLATE', src: 'TERM-052', status: 'FAIL', lat: '15ms' },
                { time: '10:41:30', op: 'ARQC_VERIFY', src: 'TERM-104', status: 'OK', lat: '22ms' },
              ].map((log, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-white/5 hover:border-white/10 transition">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-slate-500">{log.time}</span>
                    <span className="text-sm font-semibold text-white">{log.op}</span>
                    <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{log.src}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-xs font-bold ${log.status === 'OK' ? 'text-green-500' : 'text-red-500'}`}>
                      {log.status}
                    </span>
                    <span className="text-xs font-mono text-slate-500 w-12 text-right">{log.lat}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl border-l-4 border-l-amber-500">
            <div className="flex items-start gap-4">
              <div className="bg-amber-500/10 p-3 rounded-full">
                <AlertTriangle size={24} className="text-amber-500" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">System Warning</h3>
                <p className="text-slate-400 text-sm mt-1">
                  MK-2 (ZMK) key rotation recommended. Key age exceeds 180 days policy.
                </p>
                <div className="mt-4 flex gap-3">
                  <button className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black text-sm font-bold rounded-lg transition">
                    Rotate Key
                  </button>
                  <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition">
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Quick Actions & Usage */}
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Zap size={18} className="text-purple-500" />
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <Link href="/keys" className="group p-4 bg-slate-900/50 rounded-xl border border-white/5 hover:border-purple-500/50 hover:bg-purple-500/5 transition flex flex-col items-center justify-center text-center gap-2">
                <Key size={24} className="text-slate-400 group-hover:text-purple-400 transition" />
                <span className="text-xs font-medium text-slate-300 group-hover:text-white">New Key</span>
              </Link>
              <Link href="/operations" className="group p-4 bg-slate-900/50 rounded-xl border border-white/5 hover:border-green-500/50 hover:bg-green-500/5 transition flex flex-col items-center justify-center text-center gap-2">
                <Calculator size={24} className="text-slate-400 group-hover:text-green-400 transition" />
                <span className="text-xs font-medium text-slate-300 group-hover:text-white">Calc PIN</span>
              </Link>
              <Link href="/security" className="group p-4 bg-slate-900/50 rounded-xl border border-white/5 hover:border-red-500/50 hover:bg-red-500/5 transition flex flex-col items-center justify-center text-center gap-2">
                <ShieldCheck size={24} className="text-slate-400 group-hover:text-red-400 transition" />
                <span className="text-xs font-medium text-slate-300 group-hover:text-white">Audit Log</span>
              </Link>
              <Link href="/simulation" className="group p-4 bg-slate-900/50 rounded-xl border border-white/5 hover:border-blue-500/50 hover:bg-blue-500/5 transition flex flex-col items-center justify-center text-center gap-2">
                <Server size={24} className="text-slate-400 group-hover:text-blue-400 transition" />
                <span className="text-xs font-medium text-slate-300 group-hover:text-white">Console</span>
              </Link>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <RefreshCw size={18} className="text-slate-400" />
              Key Slots Status
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">LMK (Local Master Keys)</span>
                  <span className="text-white">90/100</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[90%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">ZMK (Zone Master Keys)</span>
                  <span className="text-white">45/200</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 w-[22.5%]" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">TMK (Terminal Master Keys)</span>
                  <span className="text-white">2,410/5000</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 w-[48%]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

