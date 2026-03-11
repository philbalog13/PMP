import type { CSSProperties } from 'react';
import Link from 'next/link';
import { Lock, Play } from 'lucide-react';
import { NotionBadge, NotionTooltip } from '@shared/components/notion';
import type { RoadmapItem, RoadmapStatus } from './Roadmap.types';

type BadgeVariant = 'default' | 'info' | 'accent' | 'success';

interface StatusMeta {
  label: string;
  badge: BadgeVariant;
  border: string;
  panel: string;
  glow: string;
  muted: boolean;
}

const STATUS_META: Record<RoadmapStatus, StatusMeta> = {
  locked: {
    label: 'Locked',
    badge: 'default',
    border: 'var(--n-border)',
    panel: 'var(--n-bg-secondary)',
    glow: 'transparent',
    muted: true,
  },
  available: {
    label: 'Available',
    badge: 'info',
    border: 'var(--n-info-border)',
    panel: 'color-mix(in oklab, var(--n-info-bg) 56%, var(--n-bg-elevated))',
    glow: 'rgba(53, 138, 255, 0.16)',
    muted: false,
  },
  current: {
    label: 'Current',
    badge: 'accent',
    border: 'var(--n-accent-border)',
    panel: 'color-mix(in oklab, var(--n-accent-light) 54%, var(--n-bg-elevated))',
    glow: 'rgba(32, 197, 255, 0.26)',
    muted: false,
  },
  completed: {
    label: 'Completed',
    badge: 'success',
    border: 'var(--n-success-border)',
    panel: 'color-mix(in oklab, var(--n-success-bg) 58%, var(--n-bg-elevated))',
    glow: 'rgba(46, 189, 112, 0.2)',
    muted: false,
  },
};

interface RoadmapNodeProps {
  item: RoadmapItem;
  index: number;
  xPercent?: number;
  y?: number;
  compact?: boolean;
  reducedMotion?: boolean;
}

function buildSurfaceStyle(meta: StatusMeta, compact: boolean, reducedMotion: boolean): CSSProperties {
  return {
    background: meta.panel,
    border: `1px solid ${meta.border}`,
    borderRadius: compact ? 'var(--n-radius-md)' : '20px',
    boxShadow: `0 14px 28px -22px ${meta.glow}, var(--n-shadow-md)`,
    color: 'var(--n-text-primary)',
    display: 'grid',
    gap: compact ? 'var(--n-space-2)' : 'var(--n-space-3)',
    minHeight: compact ? undefined : '132px',
    opacity: meta.muted ? 0.72 : 1,
    padding: compact ? 'var(--n-space-3)' : 'var(--n-space-4)',
    transition: reducedMotion ? 'none' : 'transform var(--n-duration-sm) var(--n-ease), box-shadow var(--n-duration-sm) var(--n-ease)',
    width: '100%',
  };
}

function NodeInner({
  item,
  compact,
  reducedMotion,
}: {
  item: RoadmapItem;
  compact: boolean;
  reducedMotion: boolean;
}) {
  const meta = STATUS_META[item.status];

  return (
    <span style={buildSurfaceStyle(meta, compact, reducedMotion)}>
      <span style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between', gap: 'var(--n-space-2)' }}>
        <span
          style={{
            alignItems: 'center',
            background: 'var(--n-bg-elevated)',
            border: `1px solid ${meta.border}`,
            borderRadius: '999px',
            color: item.status === 'locked' ? 'var(--n-text-tertiary)' : 'var(--n-accent)',
            display: 'inline-flex',
            height: '28px',
            justifyContent: 'center',
            width: '28px',
          }}
          aria-hidden="true"
        >
          {item.icon || <Play size={14} />}
        </span>
        <NotionBadge variant={meta.badge} size="sm">
          {item.status === 'locked' && <Lock size={10} />}
          {meta.label}
        </NotionBadge>
      </span>

      <span style={{ display: 'grid', gap: '4px' }}>
        <span
          style={{
            color: 'var(--n-text-primary)',
            fontSize: 'var(--n-text-sm)',
            fontWeight: 'var(--n-weight-semibold)',
            lineHeight: 'var(--n-leading-snug)',
          }}
        >
          {item.title}
        </span>
        {item.subtitle && (
          <span style={{ color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-xs)', lineHeight: 'var(--n-leading-relaxed)' }}>
            {item.subtitle}
          </span>
        )}
      </span>
    </span>
  );
}

export function RoadmapNode({
  item,
  index,
  xPercent = 50,
  y = 0,
  compact = false,
  reducedMotion = false,
}: RoadmapNodeProps) {
  const locked = item.status === 'locked';
  const wrapperStyle: CSSProperties = compact
    ? {}
    : {
        left: `${xPercent}%`,
        maxWidth: 'calc(100% - 24px)',
        position: 'absolute',
        top: `${y}px`,
        transform: 'translate(-50%, -50%)',
        width: '228px',
      };

  const interactiveStyle: CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: 'inherit',
    cursor: locked ? 'not-allowed' : 'pointer',
    display: 'block',
    padding: 0,
    textAlign: 'left',
    textDecoration: 'none',
    width: '100%',
  };

  const ariaLabel = `Step ${index + 1}: ${item.title} - ${STATUS_META[item.status].label}`;
  const nodeContent = <NodeInner item={item} compact={compact} reducedMotion={reducedMotion} />;

  if (locked) {
    return (
      <div style={wrapperStyle}>
        <NotionTooltip content="Terminez l'etape precedente pour debloquer.">
          <button type="button" className="n-focus-ring" aria-disabled="true" aria-label={ariaLabel} style={interactiveStyle}>
            {nodeContent}
          </button>
        </NotionTooltip>
      </div>
    );
  }

  if (item.href) {
    return (
      <div style={wrapperStyle}>
        <Link prefetch={false} href={item.href} className="n-focus-ring" aria-label={ariaLabel} style={interactiveStyle}>
          {nodeContent}
        </Link>
      </div>
    );
  }

  return (
    <div style={wrapperStyle}>
      <button type="button" className="n-focus-ring" aria-label={ariaLabel} style={interactiveStyle}>
        {nodeContent}
      </button>
    </div>
  );
}
