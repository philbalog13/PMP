'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbProps {
    items: BreadcrumbItem[];
    className?: string;
}

/**
 * Breadcrumb Component
 * Contextual navigation breadcrumb trail
 *
 * @example
 * <Breadcrumb items={[
 *   { label: 'Accueil', href: '/student' },
 *   { label: 'Module 5', href: '/student/modules/5' },
 *   { label: 'Exercice TPE' }
 * ]} />
 */
export default function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
    if (!items || items.length === 0) {
        return null;
    }

    return (
        <nav
            aria-label="Breadcrumb"
            className={`flex items-center space-x-2 text-sm ${className}`}
        >
            {/* Home icon as first item */}
            <Link
                href="/"
                className="text-slate-400 hover:text-slate-200 transition-colors"
                aria-label="Accueil"
            >
                <HomeIcon className="w-4 h-4" />
            </Link>

            {items.map((item, index) => {
                const isLast = index === items.length - 1;

                return (
                    <React.Fragment key={index}>
                        {/* Separator */}
                        <ChevronRightIcon className="w-4 h-4 text-slate-600" />

                        {/* Breadcrumb item */}
                        {item.href && !isLast ? (
                            <Link
                                href={item.href}
                                className="text-slate-400 hover:text-slate-200 transition-colors hover:underline"
                            >
                                {item.label}
                            </Link>
                        ) : (
                            <span
                                className={`${
                                    isLast
                                        ? 'text-slate-200 font-medium'
                                        : 'text-slate-400'
                                }`}
                                aria-current={isLast ? 'page' : undefined}
                            >
                                {item.label}
                            </span>
                        )}
                    </React.Fragment>
                );
            })}
        </nav>
    );
}
