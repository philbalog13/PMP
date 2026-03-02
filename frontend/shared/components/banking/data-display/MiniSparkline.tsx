'use client';

import { useMemo } from 'react';

/* ══════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════ */
export interface MiniSparklineProps {
  data:         number[];
  width?:       number;
  height?:      number;
  /** Couleur de la ligne — défaut : var(--bank-accent) */
  color?:       string;
  /** Afficher l'aire sous la courbe */
  filled?:      boolean;
  /** Afficher le point final */
  dotEnd?:      boolean;
  /** Épaisseur du trait */
  strokeWidth?: number;
  className?:   string;
  style?:       React.CSSProperties;
  /** Label sr-only pour l'accessibilité */
  label?:       string;
}

/* ══════════════════════════════════════════════════════
   HELPER : normalise les points en coordonnées SVG
   ══════════════════════════════════════════════════════ */
function buildPath(data: number[], w: number, h: number): { line: string; area: string } {
  if (data.length < 2) return { line: '', area: '' };

  const min  = Math.min(...data);
  const max  = Math.max(...data);
  const span = max - min || 1;

  const pad  = 2; /* px de marge verticale */
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    return [x, y] as [number, number];
  });

  /* Catmull-Rom → Bezier cubique approximé */
  const lineParts: string[] = [`M ${points[0][0]},${points[0][1]}`];
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = i > 0 ? points[i - 1] : points[i];
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const [x3, y3] = i < points.length - 2 ? points[i + 2] : points[i + 1];
    const cp1x = x1 + (x2 - x0) / 6;
    const cp1y = y1 + (y2 - y0) / 6;
    const cp2x = x2 - (x3 - x1) / 6;
    const cp2y = y2 - (y3 - y1) / 6;
    lineParts.push(`C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x2},${y2}`);
  }
  const line = lineParts.join(' ');

  /* Aire : fermer vers le bas */
  const last  = points[points.length - 1];
  const first = points[0];
  const area  = `${line} L ${last[0]},${h} L ${first[0]},${h} Z`;

  return { line, area };
}

/* ══════════════════════════════════════════════════════
   COMPOSANT
   ══════════════════════════════════════════════════════ */
export function MiniSparkline({
  data,
  width        = 80,
  height       = 32,
  color        = 'var(--bank-accent)',
  filled       = true,
  dotEnd       = true,
  strokeWidth  = 1.5,
  className    = '',
  style,
  label        = 'Graphique sparkline',
}: MiniSparklineProps) {

  const { line, area } = useMemo(
    () => buildPath(data, width, height),
    [data, width, height],
  );

  if (data.length < 2) return null;

  const last   = data[data.length - 1];
  const min    = Math.min(...data);
  const max    = Math.max(...data);
  const span   = max - min || 1;
  const pad    = 2;
  const dotX   = width;
  const dotY   = height - pad - ((last - min) / span) * (height - pad * 2);

  /* ID unique pour le gradient (évite collisions SSR) */
  const gradId = `spark-grad-${Math.abs(color.charCodeAt(0) ?? 0)}-${width}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-label={label}
      role="img"
      className={className}
      style={{ display: 'block', overflow: 'visible', ...style }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.00" />
        </linearGradient>
      </defs>

      {filled && area && (
        <path
          d={area}
          fill={`url(#${gradId})`}
          strokeWidth={0}
        />
      )}

      {line && (
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      )}

      {dotEnd && (
        <>
          <circle
            cx={dotX}
            cy={dotY}
            r={4}
            fill={color}
            opacity={0.25}
          />
          <circle
            cx={dotX}
            cy={dotY}
            r={2.5}
            fill={color}
          />
        </>
      )}
    </svg>
  );
}
