import React from 'react';

interface NotionProgressRingProps {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  ariaLabel?: string;
}

export function NotionProgressRing({
  value,
  size = 96,
  stroke = 8,
  label,
  ariaLabel,
}: NotionProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div
      className="n-progress-ring"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-label={ariaLabel ?? label ?? 'Progress'}
      style={{ display: 'inline-flex', position: 'relative', width: `${size}px`, height: `${size}px` }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--n-border)"
          strokeWidth={stroke}
          fill="transparent"
        />
        <circle
          className="n-progress-ring__value"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="transparent"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            ['--progress-offset' as string]: `${offset}px`,
          }}
        />
      </svg>
      <span
        style={{
          alignItems: 'center',
          color: 'var(--n-text-primary)',
          display: 'inline-flex',
          fontFamily: 'var(--n-font-mono)',
          fontSize: 'var(--n-text-sm)',
          fontWeight: 'var(--n-weight-bold)',
          height: '100%',
          inset: 0,
          justifyContent: 'center',
          position: 'absolute',
        }}
      >
        {label ?? `${Math.round(clamped)}%`}
      </span>
    </div>
  );
}
