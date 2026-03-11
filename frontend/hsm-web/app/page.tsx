'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  Key,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Server,
  Cpu,
  RefreshCw,
  Zap,
  Calculator,
  Loader2
} from 'lucide-react';
import { useAuth } from '@shared/context/AuthContext';
import { getHsmStatus, getHsmKeys, getHsmLogs, HsmStatus, HsmKey } from '@/lib/hsm-api';

export default function Home() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<HsmStatus | null>(null);
  const [keysCount, setKeysCount] = useState<number>(0);
  const [logs, setLogs] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [statusRes, keysRes, logsRes] = await Promise.all([
        getHsmStatus(token),
        getHsmKeys(token),
        getHsmLogs(token)
      ]);

      if (statusRes.success) setStatus(statusRes.status);
      setKeysCount(keysRes.keys?.length || 0);
      setLogs(logsRes.logs?.slice(0, 5) || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center p-24 text-slate-400 gap-2">
        <Loader2 className="animate-spin" size={24} />
        Initialize Secure Session...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white">System Overview</h1>
          <p className="text-slate-400 mt-2">Hardware Security Module  -  Model PMP-9000-v2</p>
        </div>
        <div className="flex items-center gap-4">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border animate-pulse ${status?.state === 'OPERATIONAL' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
            SYSTEM {status?.state || 'OFFLINE'}
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
            <div className="text-3xl font-bold font-heading text-white">{keysCount.toLocaleString()}</div>
            <div className="text-xs text-slate-500 mt-2">Active Slots: {status?.keysLoaded || 0}</div>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-green-500/10 rounded-bl-full transition-all group-hover:scale-110" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4 text-green-400">
              <ShieldCheck size={20} />
              <span className="text-sm font-semibold uppercase tracking-wider">Security State</span>
            </div>
            <div className="text-3xl font-bold font-heading text-white">{status?.state === 'OPERATIONAL' ? 'SECURE' : 'TAMPERED'}</div>
            <div className="text-xs text-slate-500 mt-2">{status?.tamper.tampered ? 'Tamper Detected' : 'No Tamper Events'}</div>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-purple-500/10 rounded-bl-full transition-all group-hover:scale-110" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4 text-purple-400">
              <Activity size={20} />
              <span className="text-sm font-semibold uppercase tracking-wider">Commands</span>
            </div>
            <div className="text-3xl font-bold font-heading text-white">{status?.commandCount || 0}</div>
            <div className="text-xs text-slate-500 mt-2">Global Operations Total</div>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-24 h-24 bg-amber-500/10 rounded-bl-full transition-all group-hover:scale-110" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4 text-amber-400">
              <Cpu size={20} />
              <span className="text-sm font-semibold uppercase tracking-wider">Uptime</span>
            </div>
            <div className="text-3xl font-bold font-heading text-white">{status ? Math.floor(status.uptimeSec / 60) : 0}m</div>
            <div className="text-xs text-slate-500 mt-2">Session: {status?.uptimeSec || 0}s</div>
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
              <Link href="/security" className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-full transition text-slate-300">
                View All
              </Link>
            </div>

            <div className="space-y-4">
              {logs.length > 0 ? logs.map((log, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-white/5 hover:border-white/10 transition">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className="text-sm font-semibold text-white truncate max-w-[200px]">{log.message}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-xs font-bold ${log.level === 'info' ? 'text-green-500' : 'text-amber-500'}`}>
                      {log.level?.toUpperCase() || 'INFO'}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="p-12 text-center text-slate-500 text-sm italic">
                  No recent operations logged.
                </div>
              )}
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

