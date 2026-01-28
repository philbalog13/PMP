'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { RefreshCcw, Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QRCodeDisplayProps {
    data: string;
    size?: number;
    label?: string;
    expiresInSeconds?: number;
}

export default function QRCodeDisplay({
    data,
    size = 200,
    label = "Scanner pour payer",
    expiresInSeconds = 30
}: QRCodeDisplayProps) {
    const [timeLeft, setTimeLeft] = useState(expiresInSeconds);
    const [isExpired, setIsExpired] = useState(false);
    const [token, setToken] = useState(data); // In real app, this would be a dynamic payment token

    useEffect(() => {
        if (isExpired) return;

        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    setIsExpired(true);
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isExpired, token]);

    const refreshCode = () => {
        // Simulate new token generation
        setToken(`${data}-${Date.now()}`);
        setTimeLeft(expiresInSeconds);
        setIsExpired(false);
    };

    return (
        <div className="flex flex-col items-center p-6 bg-white rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">{label}</h3>

            <div className="relative group">
                <div className={`transition-opacity duration-300 ${isExpired ? 'opacity-10 blur-sm' : 'opacity-100'}`}>
                    <QRCodeSVG
                        value={token}
                        size={size}
                        level="H"
                        includeMargin={true}
                        fgColor="#1e293b"
                    />
                </div>

                <AnimatePresence>
                    {isExpired && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex items-center justify-center"
                        >
                            <button
                                onClick={refreshCode}
                                className="flex flex-col items-center gap-2 text-blue-600 hover:text-blue-700 bg-white/90 p-4 rounded-full shadow-lg backdrop-blur-sm"
                            >
                                <RefreshCcw size={32} />
                                <span className="text-sm font-bold">Régénérer</span>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-500">
                <Timer size={16} className={timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-slate-400'} />
                <span className={timeLeft < 10 ? 'text-red-600' : ''}>
                    Expire dans {timeLeft}s
                </span>
            </div>

            <div className="w-full bg-slate-100 h-1 mt-2 rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-blue-500"
                    initial={{ width: "100%" }}
                    animate={{ width: isExpired ? "0%" : `${(timeLeft / expiresInSeconds) * 100}%` }}
                    transition={{ duration: 1, ease: "linear" }}
                />
            </div>
        </div>
    );
}
