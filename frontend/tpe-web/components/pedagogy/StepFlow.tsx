'use client';

import { useTerminalStore } from '@/lib/store';
import { ArrowRight, CheckCircle2, Circle } from 'lucide-react';

const steps = [
    { id: 1, label: 'Saisie montant', state: 'amount-input' },
    { id: 2, label: 'Lecture carte', state: 'card-wait' },
    { id: 3, label: 'Traitement', state: 'processing' },
    { id: 4, label: 'Réponse', state: 'approved' },
];

export default function StepFlow() {
    const { state } = useTerminalStore();

    const getCurrentStep = () => {
        if (state === 'idle') return 0;
        if (state === 'amount-input') return 1;
        if (state === 'card-wait') return 2;
        if (state === 'processing') return 3;
        if (state === 'approved' || state === 'declined') return 4;
        return 0;
    };

    const currentStep = getCurrentStep();

    return (
        <div className="bg-white rounded-lg shadow-xl p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Flux de Transaction</h3>

            <div className="relative">
                {/* Steps */}
                <div className="flex items-center justify-between">
                    {steps.map((step, idx) => {
                        const isActive = currentStep === step.id;
                        const isCompleted = currentStep > step.id;

                        return (
                            <div key={step.id} className="flex items-center flex-1">
                                {/* Step Circle */}
                                <div className="flex flex-col items-center flex-1">
                                    <div
                                        className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${isCompleted
                                                ? 'bg-green-500 border-green-500'
                                                : isActive
                                                    ? 'bg-blue-500 border-blue-500 scale-110'
                                                    : 'bg-white border-slate-300'
                                            }`}
                                    >
                                        {isCompleted ? (
                                            <CheckCircle2 className="w-6 h-6 text-white" />
                                        ) : (
                                            <Circle
                                                className={`w-6 h-6 ${isActive ? 'text-white' : 'text-slate-400'
                                                    }`}
                                            />
                                        )}
                                    </div>
                                    <p
                                        className={`mt-2 text-sm font-medium text-center ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-slate-500'
                                            }`}
                                    >
                                        {step.label}
                                    </p>
                                </div>

                                {/* Arrow */}
                                {idx < steps.length - 1 && (
                                    <ArrowRight
                                        className={`w-8 h-8 mx-2 ${isCompleted ? 'text-green-500' : 'text-slate-300'
                                            }`}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Progress Bar */}
                <div className="mt-8 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                        style={{ width: `${(currentStep / steps.length) * 100}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
