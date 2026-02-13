'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Wifi, Key, Zap, Play, CheckCircle, Shield, ShieldOff, RotateCcw, type LucideIcon } from 'lucide-react';

type ScenarioLogLevel = 'info' | 'warning' | 'error' | 'success';

interface ScenarioPhase {
    name: string;
    description: string;
    action: string;
}

interface ScenarioLog {
    type: ScenarioLogLevel;
    message: string;
}

interface ScenarioDefinition {
    title: string;
    icon: LucideIcon;
    description: string;
    phases: ScenarioPhase[];
    logs: ScenarioLog[];
}

const scenarioData: Record<string, ScenarioDefinition> = {
    'mitm': {
        title: 'Man-in-the-Middle Attack',
        icon: Wifi,
        description: 'Intercept and modify communication between terminal and host.',
        phases: [
            { name: 'Setup', description: 'Configure network interception', action: 'Enable ARP spoofing' },
            { name: 'Attack', description: 'Capture payment packets', action: 'Start packet capture' },
            { name: 'Detection', description: 'Observe security alerts', action: 'Check alert system' },
            { name: 'Defense', description: 'Apply TLS encryption', action: 'Enable TLS 1.3' }
        ],
        logs: [
            { type: 'info', message: 'Network interface initialized' },
            { type: 'warning', message: 'Unencrypted traffic detected' },
            { type: 'error', message: '[SIMULATED] Captured: AUTH REQ PAN=4111***1111' },
            { type: 'success', message: 'TLS handshake enforced - attack blocked' }
        ]
    },
    'weak-pin': {
        title: 'Weak PIN Attack',
        icon: Key,
        description: 'Brute-force attack using common PIN patterns.',
        phases: [
            { name: 'Setup', description: 'Load PIN dictionary', action: 'Load common PINs' },
            { name: 'Attack', description: 'Try PIN combinations', action: 'Start brute force' },
            { name: 'Detection', description: 'Monitor lockout triggers', action: 'Check lockout' },
            { name: 'Defense', description: 'Enforce PIN policy', action: 'Block weak PINs' }
        ],
        logs: [
            { type: 'info', message: 'Dictionary loaded: 1000 common PINs' },
            { type: 'warning', message: 'Trying: 1234, 0000, 1111...' },
            { type: 'error', message: '[SIMULATED] PIN 1234 matched!' },
            { type: 'success', message: 'PIN policy enforced - weak PIN rejected' }
        ]
    },
    'dos': {
        title: 'Denial of Service Attack',
        icon: Zap,
        description: 'Flood payment network with excessive requests.',
        phases: [
            { name: 'Setup', description: 'Configure request generator', action: 'Set rate to 10K/s' },
            { name: 'Attack', description: 'Flood the network', action: 'Start flood' },
            { name: 'Detection', description: 'Monitor system health', action: 'Check metrics' },
            { name: 'Defense', description: 'Enable rate limiting', action: 'Apply limits' }
        ],
        logs: [
            { type: 'info', message: 'Request generator initialized' },
            { type: 'warning', message: 'Sending 10,000 requests/second...' },
            { type: 'error', message: '[SIMULATED] Server latency: 5000ms+' },
            { type: 'success', message: 'Rate limiting active - 100 req/s max' }
        ]
    }
};

export default function ScenarioPage({ params }: { params: Promise<{ scenario: string }> }) {
    const { scenario: scenarioId } = use(params);
    const scenario = scenarioData[scenarioId];
    const [currentPhase, setCurrentPhase] = useState(0);
    const [phaseCompleted, setPhaseCompleted] = useState<boolean[]>([false, false, false, false]);
    const [logs, setLogs] = useState<ScenarioLog[]>([]);
    const [isRunning, setIsRunning] = useState(false);

    if (!scenario) {
        return (
            <div className="min-h-screen flex items-center justify-center text-white">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Scenario Not Found</h1>
                    <Link href="/vuln" className="text-blue-400 hover:underline">← Back to Lab</Link>
                </div>
            </div>
        );
    }

    const runPhase = () => {
        setIsRunning(true);
        const newLogs = [...logs, scenario.logs[currentPhase]];
        setLogs(newLogs);

        setTimeout(() => {
            const newCompleted = [...phaseCompleted];
            newCompleted[currentPhase] = true;
            setPhaseCompleted(newCompleted);
            setIsRunning(false);
            if (currentPhase < 3) setCurrentPhase(currentPhase + 1);
        }, 1500);
    };

    const reset = () => {
        setCurrentPhase(0);
        setPhaseCompleted([false, false, false, false]);
        setLogs([]);
    };

    const Icon = scenario.icon;
    const allComplete = phaseCompleted.every(Boolean);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/vuln" className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition">
                        <ArrowLeft size={20} />
                    </Link>
                    <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400">
                        <Icon size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{scenario.title}</h1>
                        <p className="text-slate-400 text-sm">{scenario.description}</p>
                    </div>
                </div>
                <button onClick={reset} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition">
                    <RotateCcw size={16} /> Reset
                </button>
            </div>

            {/* Phase Progress */}
            <div className="grid grid-cols-4 gap-4">
                {scenario.phases.map((phase, idx) => (
                    <div
                        key={idx}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${currentPhase === idx ? 'border-red-500/50 bg-red-500/10' :
                            phaseCompleted[idx] ? 'border-green-500/30 bg-green-500/5' : 'border-white/5 bg-slate-900/50'
                            }`}
                        onClick={() => !isRunning && setCurrentPhase(idx)}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-slate-400">Phase {idx + 1}</span>
                            {phaseCompleted[idx] ? <CheckCircle size={16} className="text-green-400" /> :
                                currentPhase === idx ? <Play size={16} className="text-red-400" /> :
                                    <div className="w-4 h-4 rounded-full border border-slate-600" />}
                        </div>
                        <h4 className="font-bold text-white text-sm">{phase.name}</h4>
                        <p className="text-xs text-slate-500 mt-1">{phase.description}</p>
                    </div>
                ))}
            </div>

            {/* Action Panel */}
            <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl border border-white/5 bg-slate-900/50">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                        {currentPhase < 2 ? <ShieldOff size={18} className="text-red-400" /> : <Shield size={18} className="text-green-400" />}
                        {scenario.phases[currentPhase].name}
                    </h3>
                    <p className="text-slate-400 mb-6">{scenario.phases[currentPhase].description}</p>
                    <button
                        onClick={runPhase}
                        disabled={isRunning || phaseCompleted[currentPhase]}
                        className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition ${phaseCompleted[currentPhase]
                            ? 'bg-green-500/20 text-green-400 cursor-not-allowed'
                            : isRunning
                                ? 'bg-amber-500/20 text-amber-400 cursor-wait'
                                : currentPhase < 2
                                    ? 'bg-red-600 hover:bg-red-500 text-white'
                                    : 'bg-green-600 hover:bg-green-500 text-white'
                            }`}
                    >
                        {phaseCompleted[currentPhase] ? <><CheckCircle size={18} /> Completed</> :
                            isRunning ? 'Executing...' :
                                <><Play size={18} /> {scenario.phases[currentPhase].action}</>}
                    </button>
                </div>

                {/* Logs */}
                <div className="p-6 rounded-2xl border border-white/5 bg-slate-900/50">
                    <h3 className="font-bold text-white mb-4">Activity Log</h3>
                    <div className="space-y-2 font-mono text-sm max-h-48 overflow-y-auto">
                        {logs.length === 0 ? (
                            <p className="text-slate-500">No activity yet. Run a phase to see logs.</p>
                        ) : logs.map((log, idx) => (
                            <div key={idx} className={`flex items-start gap-2 ${log.type === 'error' ? 'text-red-400' :
                                log.type === 'warning' ? 'text-amber-400' :
                                    log.type === 'success' ? 'text-green-400' : 'text-slate-400'
                                }`}>
                                <span className="text-slate-600">[{String(idx + 1).padStart(2, '0')}]</span>
                                {log.message}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Completion Banner */}
            {allComplete && (
                <div className="p-6 rounded-2xl border border-green-500/30 bg-green-500/10 text-center">
                    <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Scenario Complete!</h3>
                    <p className="text-slate-400 mb-4">You&apos;ve learned how to attack and defend against {scenario.title.toLowerCase()}.</p>
                    <Link href="/vuln" className="inline-block px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold transition">
                        Back to Lab
                    </Link>
                </div>
            )}
        </div>
    );
}
