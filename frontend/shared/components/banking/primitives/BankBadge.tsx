import type { LucideIcon } from 'lucide-react';

/* ══════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════ */
export type BankBadgeVariant =
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'pending'
  | 'neutral'
  | 'accent';

export interface BankBadgeProps {
  variant:  BankBadgeVariant;
  label:    string;
  icon?:    LucideIcon;
  /** Afficher un dot de statut au lieu d'une icône */
  dot?:     boolean;
  /** Déclenche animation pulse (success) ou shake (danger) au mount */
  animate?: boolean;
}

/* ══════════════════════════════════════════════════════
   MAPPING statuts transaction → variant
   Accepte les formats backend (uppercase) et normalisés
   ══════════════════════════════════════════════════════ */
export function transactionStatusToVariant(status: string): BankBadgeVariant {
  const s = status?.toUpperCase() ?? '';
  if (s === 'APPROVED' || s === 'AUTHORIZED' || s === 'SETTLED' || s === 'AVAILABLE') {
    return 'success';
  }
  if (s === 'DECLINED' || s === 'REFUSED' || s === 'FAILED' || s === 'ERROR') {
    return 'danger';
  }
  if (s === 'VOIDED' || s === 'CANCELLED' || s === 'VOID') {
    return 'neutral';
  }
  if (s === 'PENDING' || s === 'PROCESSING' || s === 'PENDING_SETTLEMENT') {
    return 'pending';
  }
  if (s === 'REFUNDED' || s === 'REFUND') {
    return 'info';
  }
  return 'neutral';
}

export function transactionStatusToLabel(status: string): string {
  const labels: Record<string, string> = {
    APPROVED:           'Approuvée',
    AUTHORIZED:         'Autorisée',
    SETTLED:            'Réglée',
    AVAILABLE:          'Disponible',
    DECLINED:           'Refusée',
    REFUSED:            'Refusée',
    FAILED:             'Échouée',
    ERROR:              'Erreur',
    VOIDED:             'Annulée',
    CANCELLED:          'Annulée',
    VOID:               'Annulée',
    PENDING:            'En attente',
    PROCESSING:         'En cours',
    PENDING_SETTLEMENT: 'En attente règlement',
    REFUNDED:           'Remboursée',
    REFUND:             'Remboursement',
  };
  return labels[status?.toUpperCase()] ?? status ?? '—';
}

/* ══════════════════════════════════════════════════════
   COMPOSANT
   ══════════════════════════════════════════════════════ */
export function BankBadge({ variant, label, icon: Icon, dot = false, animate = false }: BankBadgeProps) {
  return (
    <span
      className={`bk-badge bk-badge--${variant}`}
      role="status"
      data-animate={animate ? 'true' : undefined}
    >
      {dot && (
        <span
          className={`bk-status-dot bk-status-dot--${
            variant === 'success' ? 'online'
            : variant === 'danger' ? 'offline'
            : 'idle'
          }`}
          aria-hidden="true"
        />
      )}
      {!dot && Icon && (
        <Icon size={10} aria-hidden="true" strokeWidth={2.5} />
      )}
      {label}
    </span>
  );
}

/* ══════════════════════════════════════════════════════
   HELPER — crée un badge depuis un statut de transaction
   Anime automatiquement APPROVED (pulse) et DECLINED (shake)
   ══════════════════════════════════════════════════════ */
export function TransactionBadge({ status, animate = false }: { status: string; animate?: boolean }) {
  const variant = transactionStatusToVariant(status);
  return (
    <BankBadge
      variant={variant}
      label={transactionStatusToLabel(status)}
      animate={animate && (variant === 'success' || variant === 'danger')}
    />
  );
}
