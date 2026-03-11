/**
 * Notion Design System — Barrel export
 * Composants minimalistes style Notion pour la plateforme PMP
 */

// ─── Phase 1 · Layout Shell ───────────────────────────────────────────────────
export { NotionLayout } from './NotionLayout';
export { NotionSidebar } from './NotionSidebar';
export { NotionTopbar } from './NotionTopbar';

export type { NavItem, NavSection } from './NotionSidebar';
export type { BreadcrumbItem } from './NotionTopbar';

// ─── Phase 2 · Composants Atomiques ──────────────────────────────────────────
export { NotionCard } from './NotionCard';
export { NotionBadge } from './NotionBadge';
export { NotionButton } from './NotionButton';
export { NotionPill } from './NotionPill';
export { NotionTabs } from './NotionTabs';
export { NotionProgress } from './NotionProgress';
export { NotionProgressRing } from './NotionProgressRing';
export { NotionModal } from './NotionModal';
export { NotionTooltip } from './NotionTooltip';
export { NotionToastProvider, useNotionToast } from './NotionToast';
export { NotionSkeleton } from './NotionSkeleton';
export { NotionEmptyState } from './NotionEmptyState';
export { NotionTag } from './NotionTag';
