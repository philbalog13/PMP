import React, { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface PremiumButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'glass' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    glow?: boolean;
    icon?: ReactNode;
    children?: ReactNode;
}

// Fallback for cn if not available in app context, typically we'd import from shared
function classNames(...inputs: (string | undefined | null | false)[]) {
    return inputs.filter(Boolean).join(' ');
}

/**
 * PremiumButton Component
 * High-end interactive button with glow effects and glassmorphism
 */
export default function PremiumButton({
    children,
    className = '',
    variant = 'primary',
    size = 'md',
    isLoading = false,
    glow = false,
    icon,
    disabled,
    ...props
}: PremiumButtonProps) {

    const baseStyles = "relative inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300 overflow-hidden";

    const variants = {
        primary: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30 border border-blue-400/20",
        secondary: "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-600",
        ghost: "bg-transparent hover:bg-white/5 text-slate-300 hover:text-white",
        glass: "bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 text-white shadow-lg",
        danger: "bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20"
    };

    const sizes = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-5 py-2.5 text-sm",
        lg: "px-8 py-4 text-base"
    };

    const glowEffect = glow ? "shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)]" : "";
    const loadingState = isLoading ? "opacity-80 cursor-wait" : "";

    // Use custom classNames if cn not available, but ideally we use tailwind-merge
    // For shared component without dependencies, we can use simple join
    const combinedClasses = classNames(
        baseStyles,
        variants[variant],
        sizes[size],
        glowEffect,
        loadingState,
        className
    );

    return (
        <button
            className={combinedClasses}
            disabled={disabled || isLoading}
            {...props}
        >
            {/* Shimmer Effect on Hover for primary */}
            {variant === 'primary' && !isLoading && !disabled && (
                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-0" />
            )}

            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {icon && !isLoading && <span className="mr-2">{icon}</span>}
            <span className="relative z-10 flex items-center">{children}</span>
        </button>
    );
}
