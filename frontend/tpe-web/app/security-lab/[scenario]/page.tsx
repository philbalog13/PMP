'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, CreditCard, Lock, Play, CheckCircle, Shield, ShieldOff, RotateCcw } from 'lucide-react';

const scenarioData: Record<string, any> = {
    'pan-harvesting': {
        title: 'PAN Harvesting Attack',
        icon: CreditCard,
        description: 'Skim card numbers from terminal memory or magstripe reader.',
        phases: [
            { name: 'Inject', description: 'Install malicious skimmer code', action: 'Deploy skimmer' },
            { name: 'Capture', description: 'Harvest PANs from transactions', action: 'Capture cards' },
            { name: 'Detection', description: 'Observe integrity alerts', action: 'Check integrity' },
            { name: 'Defense', description: 'Enable memory encryption', action: 'Encrypt RAM' }
        ],
        logs: [
            { type: 'warning', message: 'Skimmer code injected into magstripe handler' },
            { type: 'error', message: '[SIMULATED] Captured: 4111111111111111, 5500000000000004' },
            { type: 'info', message: 'Integrity check: MISMATCH detected in code hash' },
            { type: 'success', message: 'Memory encryption enabled - PANs now encrypted in RAM' }
        ]
    },
    'auth-bypass': {
        title: 'EMV Authentication Bypass',
        icon: Lock,
        description: 'Force downgrade to magstripe to bypass chip security.',
        phases: [
            { name: 'Downgrade', description: 'Force fallback to magstripe', action: 'Trigger fallback' },
            { name: 'Bypass', description: 'Skip ARQC verification', action: 'Bypass cryptogram' },
            { name: 'Detection', description: 'Check authorization flags', action: 'Monitor flags' },
            { name: 'Defense', description: 'Enforce chip-only policy', action: 'Block fallback' }
        ],
        logs: [
            { type: 'warning', message: 'Chip read failed - triggering fallback to magstripe' },
            { type: 'error', message: '[SIMULATED] Transaction authorized without ARQC!' },
            { type: 'info', message: 'Alert: EMV_FALLBACK flag set without issuer approval' },
            { type: 'success', message: 'Chip-only policy enforced - fallback blocked' }
        ]
    }
};

export default function ScenarioPage({ params }: { params: Promise<{ scenario: string }> }) {
    const { scenario: scenarioId } = use(params);
    const scenario = scenarioData[scenarioId];
    const [currentPhase, setCurrentPhase] = useState(0);
    const [phaseCompleted, setPhaseCompleted] = useState<boolean[]>([false, false, false, false]);
    const [logs, setLogs] = useState<{ type: string; message: string }[]>([]);
    const [isRunning, setIsRunning] = useState(false);

    if (!scenario) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Scenario Not Found</h1>
                    <Link href="/security-lab" className="text-orange-400 hover:underline">← Back to Lab</Link>
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
        <div className="min-h-screen bg-slate-950 p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/security-lab" className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition">
                            <ArrowLeft size={20} />
                        </Link>
                        <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400">
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

                {/* Phases */}
                <div className="grid grid-cols-4 gap-4">
                    {scenario.phases.map((phase: any, idx: number) => (
                        <div
                            key={idx}
                            className={`p-4 rounded-xl border transition-all cursor-pointer ${currentPhase === idx ? 'border-orange-500/50 bg-orange-500/10' :
                                phaseCompleted[idx] ? 'border-green-500/30 bg-green-500/5' : 'border-white/5 bg-slate-900/50'
                                }`}
                            onClick={() => !isRunning && setCurrentPhase(idx)}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-slate-400">Phase {idx + 1}</span>
                                {phaseCompleted[idx] ? <CheckCircle size={16} className="text-green-400" /> :
                                    currentPhase === idx ? <Play size={16} className="text-orange-400" /> :
                                        <div className="w-4 h-4 rounded-full border border-slate-600" />}
                            </div>
                            <h4 className="font-bold text-white text-sm">{phase.name}</h4>
                            <p className="text-xs text-slate-500 mt-1">{phase.description}</p>
                        </div>
                    ))}
                </div>

                {/* Action + Logs */}
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-6 rounded-2xl border border-white/5 bg-slate-900/50">
                        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                            {currentPhase < 2 ? <ShieldOff size={18} className="text-orange-400" /> : <Shield size={18} className="text-green-400" />}
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
                                        ? 'bg-orange-600 hover:bg-orange-500 text-white'
                                        : 'bg-green-600 hover:bg-green-500 text-white'
                                }`}
                        >
                            {phaseCompleted[currentPhase] ? <><CheckCircle size={18} /> Completed</> :
                                isRunning ? 'Executing...' :
                                    <><Play size={18} /> {scenario.phases[currentPhase].action}</>}
                        </button>
                    </div>

                    <div className="p-6 rounded-2xl border border-white/5 bg-slate-900/50">
                        <h3 className="font-bold text-white mb-4">Activity Log</h3>
                        <div className="space-y-2 font-mono text-sm max-h-48 overflow-y-auto">
                            {logs.length === 0 ? (
                                <p className="text-slate-500">No activity yet.</p>
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

                {/* Completion */}
                {allComplete && (
                    <div className="p-6 rounded-2xl border border-green-500/30 bg-green-500/10 text-center">
                        <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">Scenario Complete!</h3>
                        <p className="text-slate-400 mb-4">You&apos;ve learned attack and defense for {scenario.title.toLowerCase()}.</p>
                        <Link href="/security-lab" className="inline-block px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold transition">
                            Back to Lab
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
