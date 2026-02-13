'use client';

import { useState } from 'react';
import {
    Shield, Activity, GitBranch, Database, Clock, CheckCircle2,
    XCircle, AlertTriangle, ChevronDown, ChevronUp, CreditCard,
    Store, Zap, BarChart3, BookOpen, ArrowRight, Wallet, Send,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
export interface TimelineStep {
    step: number;
    name: string;
    category: 'process' | 'security' | 'decision' | 'data';
    status: string;
    timestamp: string;
    duration_ms: number;
    details: Record<string, any>;
}

interface TransactionTimelineProps {
    steps: TimelineStep[];
    transactionSummary?: {
        amount?: number;
        currency?: string;
        merchantName?: string;
        status?: string;
        maskedPan?: string;
    };
}

/* ------------------------------------------------------------------ */
/*  Phase groupings — lifecycle stages                                 */
/* ------------------------------------------------------------------ */
interface Phase {
    id: string;
    label: string;
    description: string;
    icon: any;
    color: string;
    bgColor: string;
    borderColor: string;
    glowColor: string;
    stepRange: [number, number]; // inclusive
}

const PHASES: Phase[] = [
    {
        id: 'initiation',
        label: 'Initiation',
        description: 'La transaction est lancée par le terminal de paiement',
        icon: Zap,
        color: 'text-sky-400',
        bgColor: 'bg-sky-500/10',
        borderColor: 'border-sky-500/30',
        glowColor: 'shadow-sky-500/10',
        stepRange: [1, 2],
    },
    {
        id: 'validation',
        label: 'Validation & Sécurité',
        description: 'Vérification de la carte, des limites et détection de fraude',
        icon: Shield,
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
        glowColor: 'shadow-amber-500/10',
        stepRange: [3, 6],
    },
    {
        id: 'authorization',
        label: 'Autorisation',
        description: 'Décision finale d\'approbation ou de refus',
        icon: GitBranch,
        color: 'text-violet-400',
        bgColor: 'bg-violet-500/10',
        borderColor: 'border-violet-500/30',
        glowColor: 'shadow-violet-500/10',
        stepRange: [7, 7],
    },
    {
        id: 'settlement',
        label: 'Règlement',
        description: 'Débit du compte, écriture comptable et mise en file d\'attente',
        icon: Database,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/30',
        glowColor: 'shadow-emerald-500/10',
        stepRange: [8, 10],
    },
];

/* ------------------------------------------------------------------ */
/*  Category & Status configs                                          */
/* ------------------------------------------------------------------ */
const categoryConfig: Record<string, { icon: any; color: string; label: string }> = {
    process:  { icon: Activity,   color: 'text-blue-400',    label: 'Processus' },
    security: { icon: Shield,     color: 'text-amber-400',   label: 'Sécurité' },
    decision: { icon: GitBranch,  color: 'text-violet-400',  label: 'Décision' },
    data:     { icon: Database,   color: 'text-emerald-400', label: 'Données' },
};

const statusConfig: Record<string, { color: string; bgColor: string; icon: any; label: string }> = {
    success:  { color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', icon: CheckCircle2, label: 'Succès' },
    approved: { color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', icon: CheckCircle2, label: 'Approuvé' },
    settled:  { color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', icon: CheckCircle2, label: 'Réglé' },
    failed:   { color: 'text-red-400',     bgColor: 'bg-red-500/20',     icon: XCircle,      label: 'Échoué' },
    declined: { color: 'text-red-400',     bgColor: 'bg-red-500/20',     icon: XCircle,      label: 'Refusé' },
    warning:  { color: 'text-amber-400',   bgColor: 'bg-amber-500/20',   icon: AlertTriangle, label: 'Alerte' },
    skipped:  { color: 'text-slate-400',   bgColor: 'bg-slate-500/20',   icon: AlertTriangle, label: 'Ignoré' },
    queued:   { color: 'text-blue-400',    bgColor: 'bg-blue-500/20',    icon: Clock,         label: 'En attente' },
    pending:  { color: 'text-blue-400',    bgColor: 'bg-blue-500/20',    icon: Clock,         label: 'En attente' },
};

/* ------------------------------------------------------------------ */
/*  Step-specific icons for better visual identification                */
/* ------------------------------------------------------------------ */
const stepIcons: Record<string, any> = {
    'Transaction Initiated': Zap,
    'Merchant Resolution': Store,
    'Card Validation': CreditCard,
    'Limit Verification': BarChart3,
    'Balance Check': Wallet,
    'Fraud Detection': Shield,
    'Authorization Decision': GitBranch,
    'Card Balance Debit': ArrowRight,
    'Merchant Ledger Booking': BookOpen,
    'Settlement Queued': Send,
};

/* ------------------------------------------------------------------ */
/*  Format detail keys for display                                     */
/* ------------------------------------------------------------------ */
function formatKey(key: string): string {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/^./, s => s.toUpperCase())
        .trim();
}

function formatValue(value: any): string {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
    if (Array.isArray(value)) return value.length === 0 ? 'Aucun' : value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

/* ------------------------------------------------------------------ */
/*  Single Step Card                                                   */
/* ------------------------------------------------------------------ */
function StepCard({ step, isLast }: { step: TimelineStep; isLast: boolean }) {
    const [expanded, setExpanded] = useState(false);
    const cat = categoryConfig[step.category] || categoryConfig.process;
    const status = statusConfig[step.status] || statusConfig.success;
    const StepIcon = stepIcons[step.name] || cat.icon;
    const StatusIcon = status.icon;
    const detailEntries = Object.entries(step.details || {});

    return (
        <div className="relative flex gap-4">
            {/* Vertical connector line */}
            <div className="flex flex-col items-center">
                <div className={`
                    relative z-10 w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                    ${status.bgColor} border ${step.status === 'approved' ? 'border-emerald-500/50' : step.status === 'queued' ? 'border-blue-500/30 animate-pulse' : 'border-white/10'}
                `}>
                    <StepIcon size={18} className={status.color} />
                </div>
                {!isLast && (
                    <div className={`w-px flex-1 min-h-[20px] ${
                        ['failed','declined'].includes(step.status) ? 'bg-red-500/40' :
                        ['queued','pending'].includes(step.status) ? 'bg-blue-500/30 border-l border-dashed border-blue-500/30' :
                        'bg-gradient-to-b from-white/15 to-white/5'
                    }`} />
                )}
            </div>

            {/* Card */}
            <div
                className={`
                    flex-1 mb-3 rounded-xl border transition-all duration-200 cursor-pointer
                    bg-slate-800/40 hover:bg-slate-800/60 backdrop-blur-sm
                    ${step.status === 'approved' ? 'border-emerald-500/30 shadow-lg shadow-emerald-500/5' :
                      step.status === 'queued' ? 'border-blue-500/20' :
                      ['failed','declined'].includes(step.status) ? 'border-red-500/30' :
                      'border-white/8 hover:border-white/15'}
                `}
                onClick={() => detailEntries.length > 0 && setExpanded(!expanded)}
            >
                <div className="p-3.5">
                    {/* Header row */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-slate-500">#{step.step}</span>
                                <h4 className="text-sm font-semibold text-white truncate">{step.name}</h4>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                                <span className={`text-[10px] uppercase tracking-wider font-medium ${cat.color}`}>{cat.label}</span>
                                <span className="text-[10px] text-slate-600">|</span>
                                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <Clock size={9} />
                                    {step.duration_ms}ms
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${status.bgColor} ${status.color}`}>
                                <StatusIcon size={10} />
                                {status.label}
                            </span>
                            {detailEntries.length > 0 && (
                                expanded
                                    ? <ChevronUp size={14} className="text-slate-500" />
                                    : <ChevronDown size={14} className="text-slate-500" />
                            )}
                        </div>
                    </div>

                    {/* Expanded detail grid */}
                    {expanded && detailEntries.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/5">
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                                {detailEntries.map(([key, value]) => (
                                    <div key={key} className="flex justify-between items-baseline gap-2 text-xs min-w-0">
                                        <span className="text-slate-500 shrink-0 text-[11px]">{formatKey(key)}</span>
                                        <span className="text-slate-300 font-mono text-[11px] text-right truncate max-w-[200px]">
                                            {formatValue(value)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Phase Section                                                      */
/* ------------------------------------------------------------------ */
function PhaseSection({ phase, steps, isLastPhase }: { phase: Phase; steps: TimelineStep[]; isLastPhase: boolean }) {
    const PhaseIcon = phase.icon;
    const phaseDuration = steps.reduce((sum, s) => sum + s.duration_ms, 0);
    const allSuccess = steps.every(s => ['success', 'approved', 'settled', 'queued', 'pending'].includes(s.status));
    const hasFailed = steps.some(s => ['failed', 'declined'].includes(s.status));

    return (
        <div className="relative">
            {/* Phase header */}
            <div className={`
                mb-4 p-4 rounded-2xl border backdrop-blur-sm
                ${phase.bgColor} ${phase.borderColor}
                shadow-lg ${phase.glowColor}
            `}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl bg-white/5 border border-white/10`}>
                            <PhaseIcon size={20} className={phase.color} />
                        </div>
                        <div>
                            <h3 className={`text-sm font-bold ${phase.color}`}>{phase.label}</h3>
                            <p className="text-[11px] text-slate-400 mt-0.5">{phase.description}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-right">
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Durée</p>
                            <p className="text-sm font-bold text-white font-mono">{phaseDuration}ms</p>
                        </div>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            hasFailed ? 'bg-red-500/20' : allSuccess ? 'bg-emerald-500/20' : 'bg-blue-500/20'
                        }`}>
                            {hasFailed ? <XCircle size={16} className="text-red-400" /> :
                             allSuccess ? <CheckCircle2 size={16} className="text-emerald-400" /> :
                             <Clock size={16} className="text-blue-400" />}
                        </div>
                    </div>
                </div>
            </div>

            {/* Steps within phase */}
            <div className="ml-2 pl-4 border-l border-white/5">
                {steps.map((step, idx) => (
                    <StepCard
                        key={step.step}
                        step={step}
                        isLast={isLastPhase && idx === steps.length - 1}
                    />
                ))}
            </div>

            {/* Phase connector arrow */}
            {!isLastPhase && (
                <div className="flex justify-center py-2">
                    <div className="flex flex-col items-center gap-1">
                        <div className="w-px h-4 bg-gradient-to-b from-white/10 to-white/20" />
                        <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                            <ArrowRight size={10} className="text-slate-400 rotate-90" />
                        </div>
                        <div className="w-px h-4 bg-gradient-to-b from-white/20 to-white/10" />
                    </div>
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Duration progress bar                                              */
/* ------------------------------------------------------------------ */
function DurationBar({ steps }: { steps: TimelineStep[] }) {
    const totalDuration = steps.reduce((sum, s) => sum + s.duration_ms, 0);
    if (totalDuration === 0) return null;

    const segments = steps.map(s => ({
        name: s.name,
        duration: s.duration_ms,
        pct: Math.max((s.duration_ms / totalDuration) * 100, 2), // min 2% for visibility
        status: s.status,
        category: s.category,
    }));

    const categoryColors: Record<string, string> = {
        process: 'bg-blue-500',
        security: 'bg-amber-500',
        decision: 'bg-violet-500',
        data: 'bg-emerald-500',
    };

    return (
        <div className="mb-6 p-4 rounded-2xl border border-white/10 bg-slate-800/30">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Répartition du temps de traitement</span>
                <span className="text-xs font-mono text-white font-bold">{totalDuration}ms total</span>
            </div>
            <div className="h-3 rounded-full bg-slate-700/50 overflow-hidden flex">
                {segments.map((seg, i) => (
                    <div
                        key={i}
                        className={`h-full ${categoryColors[seg.category] || 'bg-slate-500'} ${
                            ['failed','declined'].includes(seg.status) ? 'opacity-50' : 'opacity-80'
                        } ${i === 0 ? 'rounded-l-full' : ''} ${i === segments.length - 1 ? 'rounded-r-full' : ''}`}
                        style={{ width: `${seg.pct}%` }}
                        title={`${seg.name}: ${seg.duration}ms`}
                    />
                ))}
            </div>
            <div className="flex justify-between mt-2">
                {segments.filter(s => s.duration > 0).slice(0, 4).map((seg, i) => (
                    <span key={i} className="text-[9px] text-slate-500 flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${categoryColors[seg.category]}`} />
                        {seg.name.split(' ').slice(0, 2).join(' ')} ({seg.duration}ms)
                    </span>
                ))}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export default function TransactionTimeline({ steps, transactionSummary }: TransactionTimelineProps) {
    // Group steps into lifecycle phases
    const phaseData = PHASES.map(phase => {
        const phaseSteps = steps.filter(
            s => s.step >= phase.stepRange[0] && s.step <= phase.stepRange[1]
        );
        return { phase, steps: phaseSteps };
    }).filter(p => p.steps.length > 0);

    if (steps.length === 0) {
        return (
            <div className="text-center py-20 text-slate-500">
                <Activity size={32} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">Aucune donnée de timeline disponible</p>
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Lifecycle flow header */}
            <div className="flex items-center gap-2 mb-6">
                <Activity size={16} className="text-violet-400" />
                <h3 className="text-sm font-bold text-white">Cycle de vie de la transaction</h3>
                <span className="text-[10px] text-slate-500 ml-2">{steps.length} étapes</span>
            </div>

            {/* Phase quick nav pills */}
            <div className="flex flex-wrap gap-2 mb-6">
                {phaseData.map(({ phase, steps: phaseSteps }, i) => {
                    const hasFailed = phaseSteps.some(s => ['failed','declined'].includes(s.status));
                    const allDone = phaseSteps.every(s => ['success','approved','settled'].includes(s.status));
                    return (
                        <div key={phase.id} className="flex items-center gap-2">
                            <div className={`
                                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium
                                ${phase.bgColor} ${phase.borderColor} border
                                ${hasFailed ? 'ring-1 ring-red-500/30' : ''}
                            `}>
                                <phase.icon size={12} className={phase.color} />
                                <span className={phase.color}>{phase.label}</span>
                                {hasFailed && <XCircle size={10} className="text-red-400" />}
                                {allDone && <CheckCircle2 size={10} className="text-emerald-400" />}
                            </div>
                            {i < phaseData.length - 1 && (
                                <ArrowRight size={12} className="text-slate-600" />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Duration breakdown */}
            <DurationBar steps={steps} />

            {/* Phase sections */}
            {phaseData.map(({ phase, steps: phaseSteps }, i) => (
                <PhaseSection
                    key={phase.id}
                    phase={phase}
                    steps={phaseSteps}
                    isLastPhase={i === phaseData.length - 1}
                />
            ))}
        </div>
    );
}
