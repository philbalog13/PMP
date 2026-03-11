import React from 'react';
import dynamic from 'next/dynamic';
import { NotionLayout } from '@shared/components/notion/NotionLayout';
import { NotionToastProvider } from '@shared/components/notion/NotionToast';

const StudentSidebar = dynamic(() => import('@/components/student/StudentSidebar').then((module) => module.StudentSidebar), {
  loading: () => <div style={{ width: 'var(--n-sidebar-width)', height: '100%' }} />,
});

const StudentTopbarContent = dynamic(
  () => import('@/components/student/StudentTopbarContent').then((module) => module.StudentTopbarContent),
  { loading: () => null }
);

/**
 * Student Layout — Shell Notion pour toutes les pages /student/*
 *
 * Ce layout Next.js App Router s'applique automatiquement à :
 *   /student, /student/cursus/*, /student/progress, /student/ctf/*, etc.
 *
 * Structure :
 *   NotionLayout
 *     ├── sidebar: StudentSidebar
 *     ├── topbar: StudentTopbarContent (breadcrumb + actions)
 *     └── children: page courante
 *
 * Logique métier : AUCUNE — ce layout est purement UI.
 */
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <NotionToastProvider>
      <NotionLayout
        sidebar={<StudentSidebar />}
        topbar={<StudentTopbarContent />}
      >
        {children}
      </NotionLayout>
    </NotionToastProvider>
  );
}
