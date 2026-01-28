'use client';

import { useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastNotificationProps {
    message: string;
    type: ToastType;
    duration?: number;
    onClose: () => void;
}

export function ToastNotification({
    message,
    type,
    duration = 3000,
    onClose,
}: ToastNotificationProps) {
    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(onClose, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    const icons = {
        success: <CheckCircle2 className="w-5 h-5" />,
        error: <XCircle className="w-5 h-5" />,
        warning: <AlertCircle className="w-5 h-5" />,
        info: <Info className="w-5 h-5" />,
    };

    const colors = {
        success: 'bg-green-50 border-green-200 text-green-800',
        error: 'bg-red-50 border-red-200 text-red-800',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800',
    };

    return (
        <div
            className={`fixed top-4 right-4 z-50 max-w-md p-4 border-2 rounded-lg shadow-lg flex items-start gap-3 ${colors[type]} animate-slide-in`}
        >
            <div className="flex-shrink-0">{icons[type]}</div>
            <p className="flex-1 text-sm font-medium">{message}</p>
            <button
                onClick={onClose}
                className="flex-shrink-0 hover:opacity-70 transition"
                aria-label="Fermer"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

// Hook pour utiliser les toasts
import { useState, useCallback } from 'react';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

export function useToast() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Date.now().toString();
        setToasts((prev) => [...prev, { id, message, type }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return { toasts, showToast, removeToast };
}
