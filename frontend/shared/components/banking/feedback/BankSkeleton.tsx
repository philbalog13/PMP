/* ══════════════════════════════════════════════════════
   BankSkeleton — shimmer loaders
   Variants : stat-card, transaction-row, full-page, chart, table-row
   ══════════════════════════════════════════════════════ */

export type BankSkeletonVariant =
  | 'stat-card'
  | 'transaction-row'
  | 'full-page'
  | 'chart'
  | 'table-row'
  | 'balance'
  | 'card-visual'
  | 'text-line';

interface BankSkeletonProps {
  variant?: BankSkeletonVariant;
  count?:   number;  /* répétition pour transaction-row, table-row */
  className?: string;
}

/* ── Briques atomiques ── */
function Rect({ w, h, radius = 'var(--bank-radius-md)', mb }: {
  w: string; h: string | number; radius?: string; mb?: string;
}) {
  return (
    <div
      className="bk-skeleton"
      aria-hidden="true"
      style={{
        width: w,
        height: typeof h === 'number' ? h : h,
        borderRadius: radius,
        marginBottom: mb,
        flexShrink: 0,
      }}
    />
  );
}

/* ── Variants ── */
function StatCardSkeleton() {
  return (
    <div
      className="bk-card"
      aria-hidden="true"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bank-space-3)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <Rect w="60%" h={12} mb="var(--bank-space-2)" />
          <Rect w="45%" h={28} radius="var(--bank-radius-sm)" />
        </div>
        <Rect w="40px" h={40} radius="var(--bank-radius-full)" />
      </div>
      <Rect w="50%" h={12} radius="var(--bank-radius-sm)" />
    </div>
  );
}

function TransactionRowSkeleton() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--bank-space-3)',
        padding: 'var(--bank-space-3) var(--bank-space-4)',
      }}
      aria-hidden="true"
    >
      <Rect w="40px" h={40} radius="var(--bank-radius-full)" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--bank-space-2)' }}>
        <Rect w="55%" h={13} />
        <Rect w="35%" h={11} radius="var(--bank-radius-sm)" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--bank-space-2)' }}>
        <Rect w="70px" h={14} />
        <Rect w="55px" h={18} radius="var(--bank-radius-full)" />
      </div>
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '2fr 2fr 1fr 1fr 1.5fr',
        gap: 'var(--bank-space-4)',
        padding: 'var(--bank-space-3) var(--bank-space-4)',
        alignItems: 'center',
        borderBottom: '1px solid var(--bank-border-subtle)',
      }}
      aria-hidden="true"
    >
      <Rect w="90%" h={13} />
      <Rect w="80%" h={13} />
      <Rect w="70%" h={13} />
      <Rect w="60px" h={22} radius="var(--bank-radius-full)" />
      <Rect w="80%" h={13} />
    </div>
  );
}

function BalanceSkeleton() {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bank-space-3)' }}
      aria-hidden="true"
    >
      <Rect w="30%" h={14} radius="var(--bank-radius-sm)" />
      <Rect w="55%" h={48} radius="var(--bank-radius-md)" />
      <Rect w="40%" h={13} radius="var(--bank-radius-sm)" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div
      className="bk-skeleton"
      aria-hidden="true"
      style={{
        width: '100%',
        height: 120,
        borderRadius: 'var(--bank-radius-md)',
      }}
    />
  );
}

function CardVisualSkeleton() {
  return (
    <div
      className="bk-skeleton"
      aria-hidden="true"
      style={{
        width: 'var(--bank-card-visual-width)',
        height: 'var(--bank-card-visual-height)',
        borderRadius: 'var(--bank-radius-xl)',
        maxWidth: '100%',
      }}
    />
  );
}

function TextLineSkeleton() {
  return <Rect w="85%" h={14} />;
}

function FullPageSkeleton() {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bank-space-6)' }}
      aria-label="Chargement…"
      aria-busy="true"
    >
      <Rect w="200px" h={28} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--bank-space-4)' }}>
        {[1, 2, 3, 4].map(i => <StatCardSkeleton key={i} />)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bank-space-1)' }}>
        {[1, 2, 3, 4, 5].map(i => <TransactionRowSkeleton key={i} />)}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
   ══════════════════════════════════════════════════════ */
export function BankSkeleton({
  variant  = 'stat-card',
  count    = 1,
  className = '',
}: BankSkeletonProps) {
  const render = () => {
    switch (variant) {
      case 'stat-card':        return <StatCardSkeleton />;
      case 'transaction-row':  return <TransactionRowSkeleton />;
      case 'full-page':        return <FullPageSkeleton />;
      case 'chart':            return <ChartSkeleton />;
      case 'table-row':        return <TableRowSkeleton />;
      case 'balance':          return <BalanceSkeleton />;
      case 'card-visual':      return <CardVisualSkeleton />;
      case 'text-line':        return <TextLineSkeleton />;
      default:                 return <StatCardSkeleton />;
    }
  };

  if (count === 1) {
    return (
      <div
        className={className}
        aria-busy="true"
        aria-label="Chargement…"
        role="status"
      >
        {render()}
      </div>
    );
  }

  return (
    <div
      className={className}
      aria-busy="true"
      aria-label="Chargement…"
      role="status"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bank-space-1)' }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>{render()}</div>
      ))}
    </div>
  );
}
