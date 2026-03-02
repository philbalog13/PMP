import React from 'react';
import { NotionLayout } from '@shared/components/notion/NotionLayout';
import { NotionTopbar } from '@shared/components/notion/NotionTopbar';
import { StudentSidebar } from '@/components/student/StudentSidebar';
import { StudentTopbarContent } from '@/components/student/StudentTopbarContent';

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
    <NotionLayout
      sidebar={<StudentSidebar />}
      topbar={<StudentTopbarContent />}
    >
      {children}
    </NotionLayout>
  );
}
