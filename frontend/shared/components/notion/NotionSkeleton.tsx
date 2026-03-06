import React from 'react';

type SkeletonType = 'line' | 'card' | 'avatar' | 'list' | 'stat';

interface NotionSkeletonProps {
  type?: SkeletonType;
  rows?: number;
  width?: string;
  height?: string;
  className?: string;
  style?: React.CSSProperties;
}

function SkeletonLine({
  width = '100%',
  height = '14px',
  style,
}: {
  width?: string;
  height?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 'var(--n-radius-xs)',
        background: `linear-gradient(
          90deg,
          var(--n-bg-tertiary)  25%,
          var(--n-bg-secondary) 50%,
          var(--n-bg-tertiary)  75%
        )`,
        backgroundSize: '400px 100%',
        animation: 'n-skeleton-shimmer 1.6s ease-in-out infinite',
        ...style,
      }}
    />
  );
}

export function NotionSkeleton({
  type = 'line',
  rows = 3,
  width,
  height,
  className = '',
  style,
}: NotionSkeletonProps) {
  if (type === 'line') {
    return (
      <SkeletonLine
        width={width ?? '100%'}
        height={height ?? '14px'}
        style={style}
      />
    );
  }

  if (type === 'card') {
    return (
      <div
        className={className}
        style={{
          background: 'var(--n-bg-elevated)',
          border: '1px solid var(--n-border)',
          borderRadius: 'var(--n-radius-md)',
          padding: 'var(--n-space-5)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--n-space-3)',
          ...style,
        }}
      >
        <SkeletonLine width="60%" height="18px" />
        <SkeletonLine width="100%" height="12px" />
        <SkeletonLine width="85%" height="12px" />
        <SkeletonLine width="70%" height="12px" />
      </div>
    );
  }

  if (type === 'avatar') {
    return (
      <div
        className={className}
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-3)', ...style }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            flexShrink: 0,
            background: `linear-gradient(
              90deg,
              var(--n-bg-tertiary)  25%,
              var(--n-bg-secondary) 50%,
              var(--n-bg-tertiary)  75%
            )`,
            backgroundSize: '400px 100%',
            animation: 'n-skeleton-shimmer 1.6s ease-in-out infinite',
          }}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--n-space-2)' }}>
          <SkeletonLine width="50%" height="12px" />
          <SkeletonLine width="35%" height="10px" />
        </div>
      </div>
    );
  }

  if (type === 'list') {
    const widths = ['100%', '88%', '94%', '78%', '92%', '85%', '97%', '80%'];
    return (
      <div
        className={className}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-3)', ...style }}
      >
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonLine
            key={i}
            width={widths[i % widths.length]}
            height="14px"
            style={{ animationDelay: `${i * 0.06}s` }}
          />
        ))}
      </div>
    );
  }

  if (type === 'stat') {
    return (
      <div
        className={className}
        style={{
          background: 'var(--n-bg-elevated)',
          border: '1px solid var(--n-border)',
          borderRadius: 'var(--n-radius-md)',
          padding: 'var(--n-space-5)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--n-space-2)',
          ...style,
        }}
      >
        <SkeletonLine width="40%" height="11px" />
        <SkeletonLine width="55%" height="24px" />
        <SkeletonLine width="65%" height="11px" />
      </div>
    );
  }

  return null;
}
