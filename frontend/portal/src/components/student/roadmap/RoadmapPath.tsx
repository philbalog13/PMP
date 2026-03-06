import type { RoadmapStatus } from './Roadmap.types';

interface RoadmapPathPoint {
  x: number;
  y: number;
  status: RoadmapStatus;
}

interface RoadmapPathProps {
  points: RoadmapPathPoint[];
  height: number;
  reducedMotion?: boolean;
}

function isActive(status: RoadmapStatus): boolean {
  return status === 'completed' || status === 'current';
}

export function RoadmapPath({ points, height, reducedMotion = false }: RoadmapPathProps) {
  if (points.length < 2) return null;

  return (
    <svg
      aria-hidden="true"
      style={{
        inset: 0,
        pointerEvents: 'none',
        position: 'absolute',
      }}
      viewBox={`0 0 100 ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
    >
      {points.slice(1).map((point, index) => {
        const previous = points[index];
        const controlY = (previous.y + point.y) / 2;
        const activeSegment = isActive(previous.status);
        const stroke = activeSegment ? 'var(--n-accent)' : 'var(--n-border-strong)';

        return (
          <path
            key={`${previous.x}-${previous.y}-${point.x}-${point.y}`}
            d={`M ${previous.x} ${previous.y} C ${previous.x} ${controlY}, ${point.x} ${controlY}, ${point.x} ${point.y}`}
            fill="none"
            stroke={stroke}
            strokeDasharray={activeSegment ? undefined : '6 8'}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={activeSegment ? 2.8 : 2.2}
            style={{
              transition: reducedMotion ? 'none' : 'stroke var(--n-duration-sm) var(--n-ease)',
            }}
          />
        );
      })}
    </svg>
  );
}

