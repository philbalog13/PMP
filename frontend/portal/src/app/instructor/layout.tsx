import React from 'react';
import { NotionLayout } from '@shared/components/notion/NotionLayout';
import { InstructorSidebar } from '@/components/instructor/InstructorSidebar';
import { InstructorTopbarContent } from '@/components/instructor/InstructorTopbarContent';

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
    <NotionLayout
      sidebar={<InstructorSidebar />}
      topbar={<InstructorTopbarContent />}
    >
      {children}
    </NotionLayout>
  );
}
