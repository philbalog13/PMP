'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { ChevronRight, CheckCircle, BookOpen, Play, Award } from 'lucide-react';

interface WorkshopSection { title: string; content: string; code?: string; }
interface Question { id: string; text: string; options: string[]; correctIndex: number; explanation: string; }
interface Workshop { id: string; title: string; description: string; difficulty: 'beginner' | 'intermediate' | 'advanced'; durationMinutes: number; theory: { sections: WorkshopSection[] }; exercise: { type: string; description: string }; quiz: { questions: Question[] }; }

const workshops: Record<string, Workshop> = {
    'pin-block': { id: 'pin-block', title: 'PIN Block Formats', description: 'ISO-0, ISO-1, ISO-3 encoded PIN blocks.', difficulty: 'advanced', durationMinutes: 30, theory: { sections: [{ title: 'ISO-0', content: 'XORs the PIN with the PAN for security binding.' }] }, exercise: { type: 'encoding', description: 'Encode a PIN Block.' }, quiz: { questions: [{ id: 'q1', text: 'Which format requires the PAN?', options: ['ISO-0', 'ISO-1', 'ISO-2'], correctIndex: 0, explanation: 'ISO-0 binds the PIN to the PAN for security.' }] } },
    'mac-calculation': { id: 'mac-calculation', title: 'MAC Integrity', description: 'Message Authentication Codes explanation.', difficulty: 'advanced', durationMinutes: 25, theory: { sections: [{ title: 'Purpose', content: 'Detect if data changed in transit.' }] }, exercise: { type: 'calc', description: 'Generate a MAC.' }, quiz: { questions: [{ id: 'q1', text: 'Diff between Hash and MAC?', options: ['None', 'MAC uses a Key', 'Hash is shorter'], correctIndex: 1, explanation: 'MAC requires a secret key, Hash does not.' }] } },
    'key-hierarchy': { id: 'key-hierarchy', title: 'Key Hierarchy', description: 'LMK, ZMK, TMK, ZPK relationships.', difficulty: 'intermediate', durationMinutes: 20, theory: { sections: [{ title: 'Master Keys', content: 'LMK protects local keys. ZMK protects zone keys.' }] }, exercise: { type: 'diagram', description: 'Map the keys.' }, quiz: { questions: [{ id: 'q1', text: 'What encrypts the PIN in transit?', options: ['LMK', 'ZMK', 'ZPK (Zone PIN Key)'], correctIndex: 2, explanation: 'ZPK is the working key for PINs between nodes.' }] } }
};

function useWorkshopProgress(workshopId: string) {
    const getKey = () => `workshop_progress_${workshopId}`;
    const getProgress = (): number => { if (typeof window === 'undefined') return 0; const stored = window.localStorage.getItem(getKey()); return stored ? parseInt(stored, 10) : 0; };
    const saveProgress = (progress: number) => { if (typeof window === 'undefined') return; window.localStorage.setItem(getKey(), progress.toString()); };
    return { getProgress, saveProgress };
}

export default function WorkshopPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { getProgress, saveProgress } = useWorkshopProgress(id);
    const [currentStep, setCurrentStep] = useState<'theory' | 'exercise' | 'quiz'>('theory');
    const [progress, setProgressState] = useState(() => getProgress());
    const [showConfetti, setShowConfetti] = useState(false);

    const workshop = workshops[id];
    if (!workshop) return <div className="p-8 text-white bg-slate-950 min-h-screen">Workshop not found</div>;
    const handleComplete = () => { saveProgress(100); setProgressState(100); setShowConfetti(true); };

    return (
        <div className="flex flex-col min-h-screen bg-slate-950 text-white">
            <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur">
                <div className="flex items-center gap-4">
                    <Link href="/learn" className="text-slate-400 hover:text-white transition">&larr; Back</Link>
                    <div className="h-6 w-px bg-white/10 mx-2" />
                    <h1 className="font-bold text-lg">{workshop.title}</h1>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${workshop.difficulty === 'beginner' ? 'bg-green-500/10 text-green-500 border-green-500/20' : workshop.difficulty === 'intermediate' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>{workshop.difficulty}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-slate-400">{progress}% Complete</span>
                    <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${progress}%` }} /></div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                <aside className="w-64 border-r border-white/10 bg-slate-900/30 p-4 hidden md:block">
                    <nav className="space-y-2">
                        <button onClick={() => setCurrentStep('theory')} className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition ${currentStep === 'theory' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'text-slate-400 hover:bg-white/5'}`}><BookOpen size={18} /> Theory</button>
                        <button onClick={() => setCurrentStep('exercise')} className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition ${currentStep === 'exercise' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-400 hover:bg-white/5'}`}><Play size={18} /> Practice</button>
                        <button onClick={() => setCurrentStep('quiz')} className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition ${currentStep === 'quiz' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:bg-white/5'}`}><Award size={18} /> Evaluation</button>
                    </nav>
                </aside>

                <main className="flex-1 overflow-y-auto p-8 relative">
                    <div className="max-w-3xl mx-auto space-y-8">
                        {currentStep === 'theory' && (
                            <div className="space-y-6">
                                {workshop.theory.sections.map((section, idx) => (
                                    <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-6">
                                        <h2 className="text-xl font-bold mb-4 text-white">{section.title}</h2>
                                        <p className="text-slate-300 leading-relaxed mb-4">{section.content}</p>
                                        {section.code && <pre className="bg-black/50 p-4 rounded-lg font-mono text-sm text-green-400 overflow-x-auto border border-white/5">{section.code}</pre>}
                                    </div>
                                ))}
                                <div className="flex justify-end"><button onClick={() => { setCurrentStep('exercise'); saveProgress(33); setProgressState(33); }} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold flex items-center gap-2 transition">Start Exercise <ChevronRight size={18} /></button></div>
                            </div>
                        )}
                        {currentStep === 'exercise' && (
                            <div className="space-y-6">
                                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-6 relative overflow-hidden">
                                    <h2 className="text-xl font-bold mb-2 text-white">Interactive Exercise</h2>
                                    <p className="text-amber-300 mb-6">{workshop.exercise.description}</p>
                                    <div className="h-48 bg-black/40 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center text-slate-500">Interactive Simulation: <strong>{workshop.exercise.type}</strong></div>
                                </div>
                                <div className="flex justify-between">
                                    <button onClick={() => setCurrentStep('theory')} className="px-4 py-2 text-slate-400 hover:text-white transition">&larr; Review Theory</button>
                                    <button onClick={() => { setCurrentStep('quiz'); saveProgress(66); setProgressState(66); }} className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold flex items-center gap-2 transition">Go to Quiz <ChevronRight size={18} /></button>
                                </div>
                            </div>
                        )}
                        {currentStep === 'quiz' && (
                            <div className="space-y-6">
                                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-6">
                                    <h2 className="text-xl font-bold mb-6 text-white">Knowledge Check</h2>
                                    {workshop.quiz.questions.map((q, idx) => (
                                        <div key={idx} className="mb-8">
                                            <p className="font-medium text-lg mb-4 text-white">{idx + 1}. {q.text}</p>
                                            <div className="space-y-2 pl-4 border-l-2 border-white/10">
                                                {q.options.map((opt, oIdx) => (<label key={oIdx} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer transition group"><input type="radio" name={`q-${q.id}`} className="w-4 h-4 accent-blue-500" /><span className="text-slate-300 group-hover:text-white">{opt}</span></label>))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-end"><button onClick={handleComplete} className="px-8 py-4 bg-green-500 hover:bg-green-400 text-white rounded-xl font-bold shadow-lg shadow-green-500/20 transform hover:scale-105 transition flex items-center gap-2"><CheckCircle size={20} /> Complete Workshop</button></div>
                            </div>
                        )}
                        {showConfetti && (
                            <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm">
                                <div className="bg-slate-900 border border-green-500/30 p-8 rounded-2xl text-center max-w-sm shadow-[0_0_50px_rgba(34,197,94,0.3)]">
                                    <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl"><Award size={40} className="text-white" /></div>
                                    <h2 className="text-2xl font-bold text-white mb-2">Workshop Complete!</h2>
                                    <p className="text-slate-400 mb-6">You&apos;ve mastered {workshop.title}.</p>
                                    <Link href="/learn"><button className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-slate-200 transition pointer-events-auto">Back to Dashboard</button></Link>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
