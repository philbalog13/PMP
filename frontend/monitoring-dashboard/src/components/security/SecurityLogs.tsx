import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';

const logs = [
    { id: 'LOG-001', type: 'error', event: 'Invalid PIN Attempt', severity: 'high', source: 'TPE-004', time: '10:42:01' },
    { id: 'LOG-002', type: 'success', event: 'Key Exchange', severity: 'info', source: 'HSM-01', time: '10:41:55' },
    { id: 'LOG-003', type: 'warning', event: 'Connection Lost', severity: 'medium', source: 'TPE-003', time: '10:40:12' },
    { id: 'LOG-004', type: 'success', event: 'Transaction Approval', severity: 'info', source: 'TPE-002', time: '10:38:45' },
    { id: 'LOG-005', type: 'error', event: 'MAC Verification Failed', severity: 'critical', source: 'TPE-042', time: '10:35:20' },
    { id: 'LOG-006', type: 'success', event: 'Parameter Download', severity: 'info', source: 'TPE-001', time: '10:30:00' },
];

export default function SecurityLogs() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent flex items-center gap-3">
                        <Shield className="text-red-400" /> Logs de Sécurité
                    </h2>
                    <p className="text-slate-400">Audit et traçabilité des événements critiques</p>
                </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden font-mono text-sm">
                {logs.map((log) => (
                    <div key={log.id} className="flex items-center p-4 border-b border-slate-800 hover:bg-slate-800/30 transition">
                        <div className="w-24 text-slate-500 text-xs">{log.time}</div>
                        <div className="w-10 flex justify-center">
                            {log.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                            {log.type === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                            {log.type === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
                        </div>
                        <div className="w-32">
                            <span className={`text-xs px-2 py-1 rounded bg-white/5 border ${log.severity === 'critical' ? 'border-red-500 text-red-400' :
                                log.severity === 'high' ? 'border-orange-500 text-orange-400' :
                                    log.severity === 'medium' ? 'border-yellow-500 text-yellow-400' :
                                        'border-blue-500 text-blue-400'
                                }`}>
                                {log.severity.toUpperCase()}
                            </span>
                        </div>
                        <div className={`flex-1 font-medium ${log.type === 'error' ? 'text-red-200' : 'text-slate-300'}`}>
                            {log.event}
                        </div>
                        <div className="w-32 text-slate-400 text-right">
                            {log.source}
                        </div>
                        <div className="w-24 text-slate-500 text-right text-xs">
                            {log.id}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
