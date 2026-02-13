'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@shared/types/user';
import { normalizeRole, hasRole } from '@shared/utils/roleUtils';

interface RoleViewProps {
    allowedRoles: UserRole | UserRole[];
    children: ReactNode;
    fallback?: ReactNode;
    redirectTo?: string;
}

export function RoleView({ allowedRoles, children, fallback = null, redirectTo }: RoleViewProps) {
    const [userRole] = useState<UserRole | null>(() => {
        if (typeof window === 'undefined') return null;
        return normalizeRole(localStorage.getItem('role'));
    });
    const router = useRouter();

    useEffect(() => {
        if (redirectTo && userRole && !hasRole(userRole, allowedRoles)) {
            router.push(redirectTo);
        }
    }, [userRole, allowedRoles, redirectTo, router]);

    if (userRole && hasRole(userRole, allowedRoles)) {
        return <>{children}</>;
    }

    return <>{fallback}</>;
}
