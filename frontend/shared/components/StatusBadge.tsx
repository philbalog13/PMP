'use client';

import { CheckCircle2, Clock, RotateCcw, XCircle } from 'lucide-react';
import { mapStatus } from '../lib/formatting';
import { NotionBadge } from './notion/NotionBadge';

interface StatusBadgeProps {
  status: string;
}

/**
 * StatusBadge — Wrapper Notion pour les statuts de transaction.
 * Délègue le rendu à NotionBadge, conserve les icônes lucide pour la lisibilité.
 *
 * Mapping :
 *  approved  → NotionBadge variant="success"
 *  declined  → NotionBadge variant="danger"
 *  voided    → NotionBadge variant="default"
 *  (default) → NotionBadge variant="warning"  (pending / inconnu)
 */
export default function StatusBadge({ status }: StatusBadgeProps) {
  const mapped = mapStatus(status);

  if (mapped === 'approved') {
    return (
      <NotionBadge variant="success">
        <CheckCircle2 size={11} />
        Approuvée
      </NotionBadge>
    );
  }

  if (mapped === 'declined') {
    return (
      <NotionBadge variant="danger">
        <XCircle size={11} />
        Refusée
      </NotionBadge>
    );
  }

  if (mapped === 'voided') {
    return (
      <NotionBadge variant="default">
        <RotateCcw size={11} />
        Annulée
      </NotionBadge>
    );
  }

  return (
    <NotionBadge variant="warning">
      <Clock size={11} />
      En attente
    </NotionBadge>
  );
}
