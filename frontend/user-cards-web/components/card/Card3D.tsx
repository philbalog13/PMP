'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, QrCode as QrIcon } from 'lucide-react';
import { GeneratedCard } from '@/lib/card-engine/generator';
import clsx from 'clsx';

interface Card3DProps {
    card: GeneratedCard;
    showDetails?: boolean;
}

export default function Card3D({ card, showDetails = false }: Card3DProps) {
    const [isFlipped, setIsFlipped] = useState(false);
    const [showSensitive, setShowSensitive] = useState(showDetails);

    return (
        <div className="group perspective-1000 w-[340px] h-[220px] cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
            <motion.div
                className="relative w-full h-full preserve-3d transition-all duration-500"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
            >
                {/* RECTO */}
                <div className={clsx(
                    "absolute w-full h-full backface-hidden rounded-2xl p-6 shadow-xl text-white flex flex-col justify-between overflow-hidden",
                    card.color
                )}>
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-20 bg-[url('/noise.svg')]" />
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl" />

                    {/* Top Row: Chip & NFC */}
                    <div className="flex justify-between items-start z-10">
                        <div className="w-12 h-9 bg-yellow-200 rounded-md bg-opacity-80 border border-yellow-400 relative overflow-hidden">
                            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-yellow-500" />
                            <div className="absolute top-0 left-1/3 w-[1px] h-full bg-yellow-500" />
                            <div className="absolute top-0 right-1/3 w-[1px] h-full bg-yellow-500" />
                        </div>
                        <div className="flex flex-col items-end">
                            {/* Contactless Icon */}
                            <svg className="w-6 h-6 text-white opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                            </svg>
                            <span className="text-xs font-bold mt-1 tracking-wider">{card.type}</span>
                        </div>
                    </div>

                    {/* Middle: PAN */}
                    <div className="z-10 mt-4">
                        <div className="flex items-center gap-2">
                            <p className="font-mono text-xl tracking-widest drop-shadow-md">
                                {showSensitive ? card.panFormatted : `**** **** **** ${card.pan.slice(-4)}`}
                            </p>
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowSensitive(!showSensitive); }}
                                className="p-1 hover:bg-white/20 rounded-full transition"
                            >
                                {showSensitive ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Bottom: Holder & Expiry & Logo */}
                    <div className="flex justify-between items-end z-10">
                        <div className="flex flex-col">
                            <span className="text-xs opacity-70 uppercase tracking-wider">Card Holder</span>
                            <span className="font-medium tracking-wide uppercase truncate max-w-[180px]">{card.holder}</span>
                        </div>
                        <div className="flex flex-col items-end mr-4">
                            <span className="text-xs opacity-70">Expires</span>
                            <span className="font-mono">{card.expiryDate}</span>
                        </div>
                        <div className="font-bold text-2xl italic">
                            {card.scheme}
                        </div>
                    </div>
                </div>

                {/* VERSO */}
                <div className={clsx(
                    "absolute w-full h-full backface-hidden rotate-y-180 rounded-2xl shadow-xl bg-slate-800 text-white overflow-hidden"
                )}>
                    <div className="w-full h-10 bg-black mt-6" />

                    <div className="p-6">
                        <div className="flex justify-between items-center">
                            <div className="w-2/3 h-10 bg-white/20 rounded flex items-center justify-end px-2">
                                <span className="font-mono text-black font-bold text-lg bg-white px-2 py-0.5 rounded">
                                    {card.cvv}
                                </span>
                            </div>
                            <div className="ml-4">
                                <QrIcon className="w-12 h-12 text-white" />
                            </div>
                        </div>

                        <div className="mt-8 text-[10px] opacity-60 text-justify leading-tight">
                            This card is issued by PédagoBank for educational purposes only.
                            Not valid for real financial transactions.
                            If found, please return to your instructor.
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
