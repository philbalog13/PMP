'use client';

import { useState, useCallback } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { BankSkeleton } from '../feedback/BankSkeleton';
import { BankEmptyState } from '../feedback/BankEmptyState';
import { TableProperties } from 'lucide-react';

/* ══════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════ */
export type SortDirection = 'asc' | 'desc' | null;

export interface BankTableColumn<T = Record<string, unknown>> {
  key:        string;
  header:     string;
  /** Render cell — si absent, affiche row[key] */
  render?:    (row: T, index: number) => React.ReactNode;
  sortable?:  boolean;
  align?:     'left' | 'center' | 'right';
  /** Largeur CSS fixe ou min/max */
  width?:     string | number;
  /** Classes CSS supplémentaires sur le th/td */
  className?: string;
}

interface BankTableProps<T = Record<string, unknown>> {
  columns:        BankTableColumn<T>[];
  data:           T[];
  /** Clé unique par ligne (défaut : index) */
  rowKey?:        (row: T, index: number) => string | number;
  loading?:       boolean;
  skeletonRows?:  number;
  onRowClick?:    (row: T, index: number) => void;
  emptyTitle?:    string;
  emptyDesc?:     string;
  /** Contrôle le tri depuis le parent (mode non-contrôlé si absent) */
  sortKey?:       string | null;
  sortDir?:       SortDirection;
  onSort?:        (key: string, dir: SortDirection) => void;
  caption?:       string;
  className?:     string;
  style?:         React.CSSProperties;
  /** Fond sticky du thead */
  stickyHeader?:  boolean;
}

/* ══════════════════════════════════════════════════════
   SOUS-COMPOSANT : HEADER CELLULE
   ══════════════════════════════════════════════════════ */
function SortIcon({ dir }: { dir: SortDirection }) {
  if (dir === 'asc')  return <ChevronUp  size={13} strokeWidth={2.5} aria-hidden="true" />;
  if (dir === 'desc') return <ChevronDown size={13} strokeWidth={2.5} aria-hidden="true" />;
  return <ChevronsUpDown size={13} strokeWidth={2} style={{ opacity: 0.4 }} aria-hidden="true" />;
}

/* ══════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
   ══════════════════════════════════════════════════════ */
export function BankTable<T = Record<string, unknown>>({
  columns,
  data,
  rowKey,
  loading       = false,
  skeletonRows  = 5,
  onRowClick,
  emptyTitle    = 'Aucune donnée',
  emptyDesc     = 'Il n\'y a rien à afficher pour l\'instant.',
  sortKey:      controlledSortKey,
  sortDir:      controlledSortDir,
  onSort,
  caption,
  className     = '',
  style,
  stickyHeader  = true,
}: BankTableProps<T>) {

  /* ── Tri non-contrôlé ── */
  const [internalKey, setInternalKey] = useState<string | null>(null);
  const [internalDir, setInternalDir] = useState<SortDirection>(null);

  const activeSortKey = controlledSortKey !== undefined ? controlledSortKey : internalKey;
  const activeSortDir = controlledSortDir !== undefined ? controlledSortDir : internalDir;

  const handleSort = useCallback((key: string) => {
    let next: SortDirection = 'asc';
    if (activeSortKey === key) {
      next = activeSortDir === 'asc' ? 'desc' : activeSortDir === 'desc' ? null : 'asc';
    }
    if (onSort) {
      onSort(key, next);
    } else {
      setInternalKey(next === null ? null : key);
      setInternalDir(next);
    }
  }, [activeSortKey, activeSortDir, onSort]);

  /* ── Styles communs ── */
  const cellBase: React.CSSProperties = {
    padding:    'var(--bank-space-3) var(--bank-space-4)',
    fontSize:   'var(--bank-text-sm)',
    whiteSpace: 'nowrap',
    borderBottom: '1px solid var(--bank-border-subtle)',
  };

  /* ══════════════════════════════════════════════════════
     RENDU
     ══════════════════════════════════════════════════════ */
  return (
    <div
      className={`bk-table-wrapper ${className}`}
      style={{
        overflowX:     'auto',
        borderRadius:  'var(--bank-radius-lg)',
        border:        '1px solid var(--bank-border-subtle)',
        background:    'var(--bank-bg-surface)',
        ...style,
      }}
    >
      <table
        style={{
          width:           '100%',
          borderCollapse:  'separate',
          borderSpacing:   0,
          tableLayout:     'auto',
        }}
        aria-busy={loading ? 'true' : 'false'}
      >
        {caption && <caption className="sr-only">{caption}</caption>}

        {/* ── THEAD ── */}
        <thead>
          <tr>
            {columns.map(col => {
              const isActive = activeSortKey === col.key;
              return (
                <th
                  key={col.key}
                  scope="col"
                  className={col.className ?? ''}
                  style={{
                    ...cellBase,
                    fontWeight:      'var(--bank-font-semibold)',
                    fontSize:        'var(--bank-text-xs)',
                    textTransform:   'uppercase',
                    letterSpacing:   '0.06em',
                    background:      stickyHeader ? 'var(--bank-bg-surface)' : undefined,
                    position:        stickyHeader ? 'sticky' : undefined,
                    top:             stickyHeader ? 0 : undefined,
                    zIndex:          stickyHeader ? 1 : undefined,
                    cursor:          col.sortable ? 'pointer' : 'default',
                    textAlign:       col.align ?? 'left',
                    width:           col.width,
                    userSelect:      'none',
                    transition:      'color var(--bank-t-fast)',
                    color:           isActive ? 'var(--bank-text-secondary)' : 'var(--bank-text-tertiary)',
                  }}
                  aria-sort={
                    !col.sortable ? undefined :
                    isActive && activeSortDir === 'asc' ? 'ascending' :
                    isActive && activeSortDir === 'desc' ? 'descending' :
                    'none'
                  }
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {col.header}
                    {col.sortable && <SortIcon dir={isActive ? activeSortDir : null} />}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>

        {/* ── TBODY ── */}
        <tbody>
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <tr key={`skel-${i}`} aria-hidden="true">
                {columns.map(col => (
                  <td key={col.key} style={{ ...cellBase, borderBottom: i === skeletonRows - 1 ? 'none' : undefined }}>
                    <BankSkeleton variant="text-line" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: 0, border: 'none' }}>
                <BankEmptyState
                  icon={<TableProperties size={20} />}
                  title={emptyTitle}
                  description={emptyDesc}
                />
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => {
              const key = rowKey ? rowKey(row, rowIdx) : rowIdx;
              const isClickable = Boolean(onRowClick);
              return (
                <tr
                  key={key}
                  role={isClickable ? 'button' : undefined}
                  tabIndex={isClickable ? 0 : undefined}
                  aria-label={isClickable ? `Ligne ${rowIdx + 1}` : undefined}
                  onClick={isClickable ? () => onRowClick!(row, rowIdx) : undefined}
                  onKeyDown={isClickable ? e => { if (e.key === 'Enter' || e.key === ' ') onRowClick!(row, rowIdx); } : undefined}
                  style={{
                    cursor:          isClickable ? 'pointer' : 'default',
                    transition:      'background-color var(--bank-t-fast)',
                    backgroundColor: 'transparent',
                  }}
                  className={isClickable ? 'bk-card--interactive' : undefined}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={col.key}
                      className={col.className ?? ''}
                      style={{
                        ...cellBase,
                        textAlign:   col.align ?? 'left',
                        color:       'var(--bank-text-primary)',
                        borderBottom: rowIdx === data.length - 1 ? 'none' : undefined,
                      }}
                    >
                      {col.render
                        ? col.render(row, rowIdx)
                        : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
