'use client';

import { usePathname } from 'next/navigation';
import { NotionTopbar, BreadcrumbItem } from '@shared/components/notion/NotionTopbar';

/**
 * Mapping des segments d'URL vers des labels lisibles (espace formateur)
 */
const SEGMENT_LABELS: Record<string, string> = {
  instructor:   'Formateur',
  analytics:    'Analytics',
  students:     'Étudiants',
  add:          'Ajouter',
  transactions: 'Transactions',
  timeline:     'Timeline',
  exercises:    'Exercices',
  create:       'Créer',
  edit:         'Modifier',
  ctf:          'CTF Console',
  'lab-control': 'Contrôle Lab',
};

/**
 * Génère le breadcrumb depuis le pathname courant
 * /instructor/students/abc123 → Formateur > Étudiants > ···
 */
function buildBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: BreadcrumbItem[] = [];
  let currentPath = '';

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    currentPath += '/' + seg;

    // Masquer les IDs dynamiques (UUIDs, codes) sauf si c'est le dernier segment
    const isId = /^[a-f0-9-]{8,}$/.test(seg) || (/^[A-Z0-9_-]{3,}$/.test(seg) && i > 1);
    if (isId && i < segments.length - 1) continue;

    const label =
      SEGMENT_LABELS[seg] ??
      (isId ? '···' : seg.charAt(0).toUpperCase() + seg.slice(1));
    const isLast = i === segments.length - 1;

    crumbs.push({
      label,
      href: isLast ? undefined : currentPath,
    });
  }

  return crumbs;
}

/**
 * InstructorTopbarContent — breadcrumb dans le topbar Notion (espace formateur)
 * Rendu côté client pour accès à usePathname
 */
export function InstructorTopbarContent() {
  const pathname = usePathname();
  const breadcrumbs = buildBreadcrumbs(pathname);

  return <NotionTopbar breadcrumbs={breadcrumbs} />;
}
