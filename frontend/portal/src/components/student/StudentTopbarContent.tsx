'use client';

import { usePathname } from 'next/navigation';
import { NotionTopbar, BreadcrumbItem } from '@shared/components/notion/NotionTopbar';

/**
 * Mapping des segments d'URL vers des labels lisibles
 */
const SEGMENT_LABELS: Record<string, string> = {
  student:      'Étudiant',
  cursus:       'Cursus',
  progress:     'Progression',
  quizzes:      'Quizzes',
  quiz:         'Quiz',
  ctf:          'CTF Challenges',
  defense:      'Defense Lab',
  lab:          'Lab',
  badges:       'Badges',
  transactions: 'Transactions',
  timeline:     'Timeline',
  onboarding:   'Onboarding',
  theory:       'Théorie',
  remediation:  'Remédiation',
  terminal:     'Terminal',
  leaderboard:  'Classement',
};

/**
 * Génère le breadcrumb depuis le pathname courant
 * /student/cursus/abc123/def456 →
 *   Étudiant > Cursus > Module
 */
function buildBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: BreadcrumbItem[] = [];
  let currentPath = '';

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    currentPath += '/' + seg;

    // Masquer les IDs dynamiques (UUIDs, codes) sauf si c'est le dernier
    const isId = /^[a-f0-9-]{8,}$/.test(seg) || (/^[A-Z0-9_-]{3,}$/.test(seg) && i > 1);
    if (isId && i < segments.length - 1) continue;

    const label = SEGMENT_LABELS[seg] ?? (isId ? '···' : seg.charAt(0).toUpperCase() + seg.slice(1));
    const isLast = i === segments.length - 1;

    crumbs.push({
      label,
      href: isLast ? undefined : currentPath,
    });
  }

  return crumbs;
}

/**
 * StudentTopbarContent — breadcrumb + actions dans le topbar Notion
 * Rendu côté client pour accès à usePathname
 */
export function StudentTopbarContent() {
  const pathname = usePathname();
  const breadcrumbs = buildBreadcrumbs(pathname);

  return (
    <NotionTopbar
      breadcrumbs={breadcrumbs}
    />
  );
}
