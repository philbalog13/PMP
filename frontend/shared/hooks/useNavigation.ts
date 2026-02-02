'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { BreadcrumbItem } from '../components/Breadcrumb';
import { UserRole } from '../types/user';

/**
 * useNavigation Hook
 * Provides navigation utilities and breadcrumb generation
 */
export function useNavigation() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    /**
     * Generate breadcrumbs based on current path
     */
    const breadcrumbs = useMemo((): BreadcrumbItem[] => {
        const segments = pathname.split('/').filter(Boolean);
        const items: BreadcrumbItem[] = [];

        // Map routes to friendly labels
        const routeLabels: Record<string, string> = {
            demo: 'Démo Client',
            analyze: 'Analyse Logs',
            student: 'Espace Étudiant',
            instructor: 'Hub Formateur',
            modules: 'Modules',
            exercises: 'Exercices',
            quiz: 'Quiz',
            students: 'Suivi Étudiants',
            'lab-control': 'Contrôle Lab',
            badges: 'Mes Badges',
            profile: 'Profil',
            settings: 'Paramètres',
            config: 'Configuration',
            'system-config': 'Configuration Système',
        };

        let currentPath = '';

        segments.forEach((segment, index) => {
            currentPath += `/${segment}`;
            const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

            // Don't link the last item (current page)
            items.push({
                label,
                href: index === segments.length - 1 ? undefined : currentPath,
            });
        });

        return items;
    }, [pathname]);

    /**
     * Get context from URL parameters
     */
    const context = useMemo(() => {
        return {
            role: searchParams.get('role') as UserRole | null,
            module: searchParams.get('module'),
            exercise: searchParams.get('exercise'),
            demo: searchParams.get('demo'),
            action: searchParams.get('action'),
            lab: searchParams.get('lab'),
        };
    }, [searchParams]);

    /**
     * Build URL with context parameters
     */
    const buildContextUrl = (
        baseUrl: string,
        params: Record<string, string | null | undefined>
    ): string => {
        const url = new URL(baseUrl, window.location.origin);

        Object.entries(params).forEach(([key, value]) => {
            if (value) {
                url.searchParams.set(key, value);
            }
        });

        return url.toString();
    };

    /**
     * Navigate to another app with context
     */
    const navigateWithContext = (
        appUrl: string,
        additionalParams?: Record<string, string>
    ) => {
        const params = {
            ...context,
            ...additionalParams,
        };

        const url = buildContextUrl(appUrl, params);
        window.location.href = url;
    };

    /**
     * Get return URL with success message
     */
    const getReturnUrl = (baseUrl: string, message?: string): string => {
        const params: Record<string, string> = {};

        if (message) {
            params.success = message;
        }

        return buildContextUrl(baseUrl, params);
    };

    return {
        pathname,
        breadcrumbs,
        context,
        buildContextUrl,
        navigateWithContext,
        getReturnUrl,
    };
}
