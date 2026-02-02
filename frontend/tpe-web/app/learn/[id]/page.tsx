'use client';

import WorkshopLayout from '@/components/workshops/WorkshopLayout';
import { ReactNode, use } from 'react';

// Next.js 15/16 App Router Dynamic Route
export default function WorkshopPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    // In a real app we might validate params.id here or handle missing IDs
    return (
        <WorkshopLayout workshopId={id} className="min-h-screen" />
    );
}
