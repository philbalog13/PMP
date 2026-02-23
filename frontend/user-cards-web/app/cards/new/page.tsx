'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page is deprecated — /cards/add is the canonical card creation page.
export default function NewCardRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/cards/add');
    }, [router]);
    return null;
}
