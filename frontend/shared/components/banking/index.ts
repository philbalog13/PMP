/* ═══════════════════════════════════════════════════════════
   BANKING DESIGN SYSTEM — Barrel export
   Importer depuis : @shared/components/banking
   ═══════════════════════════════════════════════════════════ */

/* ── Layout ── */
export {
  BankShell,
  useBankShell,
  type BankRole,
  type BankTheme,
}                        from './layout/BankShell';

export {
  BankSidebar,
  type BankNavItem,
}                        from './layout/BankSidebar';

export { BankTopbar }    from './layout/BankTopbar';

export {
  BankMobileNav,
  type BankMobileNavItem,
}                        from './layout/BankMobileNav';

export { BankPageHeader } from './layout/BankPageHeader';

/* ── Primitives ── */
export { BankButton }    from './primitives/BankButton';
export { BankInput }     from './primitives/BankInput';
export {
  BankBadge,
  TransactionBadge,
  transactionStatusToVariant,
  transactionStatusToLabel,
}                        from './primitives/BankBadge';
export { BankAvatar }    from './primitives/BankAvatar';
export {
  BankSpinner,
  BankSpinnerOverlay,
}                        from './primitives/BankSpinner';
export { BankDivider }   from './primitives/BankDivider';

/* ── Data Display ── */
export { StatCard }                                       from './data-display/StatCard';
export { BalanceDisplay }                                 from './data-display/BalanceDisplay';
export { TransactionRow, type BankTransaction }           from './data-display/TransactionRow';
export { TransactionList }                                from './data-display/TransactionList';
export { CardVisual, type CardVisualProps }               from './data-display/CardVisual';
export { BankTable, type BankTableColumn, type SortDirection } from './data-display/BankTable';
export { MiniSparkline, type MiniSparklineProps }         from './data-display/MiniSparkline';

/* ── Feedback ── */
export { BankSkeleton }      from './feedback/BankSkeleton';
export { BankEmptyState }    from './feedback/BankEmptyState';
export { BankModal }         from './feedback/BankModal';
export {
  BankToastProvider,
  useBankToast,
}                            from './feedback/BankToast';

/* ── Forms ── */
export { AmountInput }                        from './forms/AmountInput';
export { BankSelect, type BankSelectOption }  from './forms/BankSelect';
export { PINInput, type PINInputRef }         from './forms/PINInput';
export { BankFormField }                      from './forms/BankFormField';
