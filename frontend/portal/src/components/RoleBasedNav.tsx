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
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const storedRole = localStorage.getItem('role') as UserRole | null;
        setUserRole(storedRole);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (!isLoading && redirectTo) {
            if (userRole && !hasRole(userRole, allowedRoles)) {
                router.push(redirectTo);
            }
        }
    }, [userRole, allowedRoles, redirectTo, isLoading, router]);


    if (isLoading) {
        return null; // Or a spinner
    }

    if (userRole && hasRole(userRole, allowedRoles)) {
        return <>{children}</>;
    }

    return <>{fallback}</>;
}
