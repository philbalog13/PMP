import React from 'react';
import dynamic from 'next/dynamic';
import { NotionLayout } from '@shared/components/notion/NotionLayout';
import { NotionToastProvider } from '@shared/components/notion/NotionToast';

const InstructorSidebar = dynamic(
  () => import('@/components/instructor/InstructorSidebar').then((module) => module.InstructorSidebar),
  {
    loading: () => <div style={{ width: 'var(--n-sidebar-width)', height: '100%' }} />,
  }
);

const InstructorTopbarContent = dynamic(
  () => import('@/components/instructor/InstructorTopbarContent').then((module) => module.InstructorTopbarContent),
  { loading: () => null }
);

/**
 * Instructor Layout — Shell Notion pour toutes les pages /instructor/*
 *
 * Ce layout Next.js App Router s'applique automatiquement à :
 *   /instructor, /instructor/students/*, /instructor/analytics,
 *   /instructor/ctf, /instructor/exercises/*, /instructor/lab-control,
 *   /instructor/transactions/*, etc.
 *
 * Structure :
 *   NotionLayout
 *     ├── sidebar: InstructorSidebar
 *     ├── topbar:  InstructorTopbarContent (breadcrumb)
 *     └── children: page courante
 *
 * Logique métier : AUCUNE — ce layout est purement UI.
 */
export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  return (
    <NotionToastProvider>
      <NotionLayout
        sidebar={<InstructorSidebar />}
        topbar={<InstructorTopbarContent />}
      >
        {children}
      </NotionLayout>
    </NotionToastProvider>
  );
}
