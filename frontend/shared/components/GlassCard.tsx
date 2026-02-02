import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
    variant?: 'default' | 'interactive' | 'highlight';
    glowColor?: 'blue' | 'purple' | 'green' | 'red' | 'none';
}

/**
 * GlassCard Component
 * Core UI component for the "Premium" glassmorphism look
 */
export default function GlassCard({
    children,
    className = '',
    variant = 'default',
    glowColor = 'none',
    ...props
}: GlassCardProps) {

    const baseStyles = "relative overflow-hidden backdrop-blur-xl border border-white/5 transition-all duration-300";

    const variants = {
        default: "bg-slate-900/40 shadow-xl",
        interactive: "bg-white/5 hover:bg-white/10 hover:-translate-y-1 hover:shadow-2xl cursor-pointer",
        highlight: "bg-gradient-to-br from-blue-900/40 to-slate-900/60 border-blue-500/20"
    };

    const glows = {
        none: "",
        blue: "shadow-blue-500/10 hover:shadow-blue-500/20 hover:border-blue-500/30",
        purple: "shadow-purple-500/10 hover:shadow-purple-500/20 hover:border-purple-500/30",
        green: "shadow-green-500/10 hover:shadow-green-500/20 hover:border-green-500/30",
        red: "shadow-red-500/10 hover:shadow-red-500/20 hover:border-red-500/30"
    };

    return (
        <div
            className={`
        rounded-2xl 
        ${baseStyles} 
        ${variants[variant]} 
        ${glows[glowColor]} 
        ${className}
      `}
            {...props}
        >
            {/* Noise Texture Overlay */}
            <div className="absolute inset-0 opacity-5 pointer-events-none z-0 mix-blend-overlay bg-noise"></div>

            {/* Glow gradient for 'highlight' or specific glow colors */}
            {glowColor !== 'none' && (
                <div className={`absolute -inset-[100px] opacity-20 blur-3xl pointer-events-none radial-gradient-${glowColor}`} />
            )}

            {/* Content */}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
}
