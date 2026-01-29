import React from 'react';
import { cn } from '@/lib/utils'; // Assuming you have a utility for merging classes, if not I'll just use template literals

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    variant?: 'default' | 'interactive' | 'highlight';
    glowColor?: 'blue' | 'purple' | 'green' | 'red';
}

export default function GlassCard({
    children,
    className,
    variant = 'default',
    glowColor = 'blue',
    ...props
}: GlassCardProps) {

    const glowMap = {
        blue: 'hover:shadow-blue-500/20 hover:border-blue-500/30',
        purple: 'hover:shadow-purple-500/20 hover:border-purple-500/30',
        green: 'hover:shadow-green-500/20 hover:border-green-500/30',
        red: 'hover:shadow-red-500/20 hover:border-red-500/30',
    };

    const baseStyles = "relative overflow-hidden rounded-2xl border border-white/5 backdrop-blur-xl transition-all duration-300";

    const variants = {
        default: "bg-slate-900/40",
        interactive: `cursor-pointer hover:-translate-y-1 hover:bg-slate-800/50 ${glowMap[glowColor]}`,
        highlight: "bg-gradient-to-br from-blue-600/10 to-purple-600/10 border-blue-500/20",
    };

    return (
        <div
            className={`${baseStyles} ${variants[variant]} ${className || ''}`}
            {...props}
        >
            {/* Glossy Reflection Gradient (Top Left) */}
            <div className="absolute -top-20 -left-20 w-40 h-40 bg-white/5 rounded-full blur-3xl pointer-events-none" />

            {/* Content */}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
}
