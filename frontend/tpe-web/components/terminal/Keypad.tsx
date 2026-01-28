'use client';

import { useTerminalStore } from '@/lib/store';
import { Delete, Check, X } from 'lucide-react';

interface KeypadProps {
    onAmountComplete: (amount: number) => void;
}

export default function Keypad({ onAmountComplete }: KeypadProps) {
    const { amount, setAmount, state } = useTerminalStore();

    const handleNumberClick = (num: string) => {
        if (state !== 'amount-input') return;
        const newAmount = amount * 10 + parseFloat(num) / 100;
        if (newAmount <= 9999.99) {
            setAmount(newAmount);
        }
    };

    const handleClear = () => {
        setAmount(0);
    };

    const handleBackspace = () => {
        const newAmount = Math.floor(amount * 10) / 100;
        setAmount(newAmount);
    };

    const handleValidate = () => {
        if (amount > 0) {
            onAmountComplete(amount);
        }
    };

    const buttonClass = (type: 'number' | 'action' | 'validate' | 'cancel' = 'number') => {
        const base = 'h-16 rounded-lg font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';
        const types = {
            number: 'bg-slate-700 hover:bg-slate-600 text-white',
            action: 'bg-slate-600 hover:bg-slate-500 text-white',
            validate: 'bg-green-600 hover:bg-green-500 text-white',
            cancel: 'bg-red-600 hover:bg-red-500 text-white',
        };
        return `${base} ${types[type]}`;
    };

    const isDisabled = state !== 'amount-input';

    return (
        <div className="bg-slate-800 rounded-lg p-6 shadow-xl">
            <div className="grid grid-cols-3 gap-3">
                {/* Numbers 1-9 */}
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                        key={num}
                        onClick={() => handleNumberClick(num.toString())}
                        disabled={isDisabled}
                        className={buttonClass('number')}
                    >
                        {num}
                    </button>
                ))}

                {/* Bottom Row */}
                <button
                    onClick={handleClear}
                    disabled={isDisabled}
                    className={buttonClass('cancel')}
                    title="Effacer"
                >
                    <X className="w-6 h-6 mx-auto" />
                </button>

                <button
                    onClick={() => handleNumberClick('0')}
                    disabled={isDisabled}
                    className={buttonClass('number')}
                >
                    0
                </button>

                <button
                    onClick={handleBackspace}
                    disabled={isDisabled}
                    className={buttonClass('action')}
                    title="Correction"
                >
                    <Delete className="w-6 h-6 mx-auto" />
                </button>

                {/* Validate Button (Full Width) */}
                <button
                    onClick={handleValidate}
                    disabled={isDisabled || amount === 0}
                    className={`${buttonClass('validate')} col-span-3 flex items-center justify-center gap-2`}
                >
                    <Check className="w-6 h-6" />
                    VALIDER
                </button>
            </div>
        </div>
    );
}
