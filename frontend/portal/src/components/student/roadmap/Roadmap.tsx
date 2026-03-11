'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, List, Play, Route } from 'lucide-react';
import { NotionButton, NotionCard, NotionSkeleton } from '@shared/components/notion';
import type { RoadmapItem } from './Roadmap.types';
import { RoadmapNode } from './RoadmapNode';
import { RoadmapPath } from './RoadmapPath';

const X_PATTERN = [24, 76] as const;
const Y_STEP = 124;
const TOP_PADDING = 70;
const BOTTOM_PADDING = 80;

interface RoadmapProps {
  items: RoadmapItem[];
  loading?: boolean;
  viewPathHref?: string;
}

function getCanvasHeight(itemCount: number): number {
  const count = Math.max(itemCount, 6);
  return TOP_PADDING + BOTTOM_PADDING + (count - 1) * Y_STEP;
}

export function Roadmap({ items, loading = false, viewPathHref = '/student/progress' }: RoadmapProps) {
  const [classicView, setClassicView] = useState(false);
  const [manualViewSelection, setManualViewSelection] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const safeItems = items;

  const points = useMemo(
    () =>
      safeItems.map((item, index) => ({
        item,
        x: X_PATTERN[index % X_PATTERN.length],
        y: TOP_PADDING + index * Y_STEP,
      })),
    [safeItems]
  );

  const canvasHeight = getCanvasHeight(safeItems.length);

  const resumeItem = useMemo(
    () =>
      safeItems.find((item) => item.status === 'current') ||
      safeItems.find((item) => item.status === 'available') ||
      safeItems.find((item) => item.status === 'completed'),
    [safeItems]
  );

  useEffect(() => {
    if (manualViewSelection) return;

    const media = window.matchMedia('(max-width: 960px)');
    const applyPreferredView = () => setClassicView(media.matches);
    applyPreferredView();

    const listener = () => applyPreferredView();
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }

    media.addListener(listener);
    return () => media.removeListener(listener);
  }, [manualViewSelection]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const applyReducedMotion = () => setReducedMotion(media.matches);
    applyReducedMotion();

    const listener = () => applyReducedMotion();
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }

    media.addListener(listener);
    return () => media.removeListener(listener);
  }, []);

  return (
    <NotionCard padding="lg" style={{ overflow: 'hidden' }}>
      <div
        style={{
          alignItems: 'flex-start',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--n-space-3)',
          justifyContent: 'space-between',
          marginBottom: 'var(--n-space-4)',
        }}
      >
        <div style={{ minWidth: '220px' }}>
          <h3 style={{ color: 'var(--n-text-primary)', fontSize: 'var(--n-text-lg)', margin: 0 }}>Roadmap d&apos;apprentissage</h3>
          <p style={{ color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)', margin: '6px 0 0' }}>
            Parcours visuel premium, progression par etapes et verrouillage explicite.
          </p>
        </div>

        <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 'var(--n-space-2)' }}>
          <NotionButton
            variant="ghost"
            size="sm"
            leftIcon={classicView ? <Route size={13} /> : <List size={13} />}
            aria-pressed={classicView}
            onClick={() => {
              setManualViewSelection(true);
              setClassicView((current) => !current);
            }}
          >
            {classicView ? 'Roadmap view' : 'Classic view'}
          </NotionButton>

          <Link prefetch={false} href={viewPathHref} style={{ textDecoration: 'none' }}>
            <NotionButton variant="secondary" size="sm" leftIcon={<Route size={13} />}>
              View path
            </NotionButton>
          </Link>

          {resumeItem?.href ? (
            <Link prefetch={false} href={resumeItem.href} style={{ textDecoration: 'none' }}>
              <NotionButton size="sm" rightIcon={<ArrowRight size={13} />} leftIcon={<Play size={13} />}>
                Resume learning
              </NotionButton>
            </Link>
          ) : (
            <NotionButton size="sm" leftIcon={<Play size={13} />} disabled>
              Resume learning
            </NotionButton>
          )}
        </div>
      </div>

      {loading ? (
        <div
          style={{
            border: '1px solid var(--n-border)',
            borderRadius: 'var(--n-radius-lg)',
            minHeight: `${canvasHeight}px`,
            overflow: 'hidden',
            padding: 'var(--n-space-4)',
            position: 'relative',
          }}
        >
          <div style={{ display: 'grid', gap: 'var(--n-space-3)' }}>
            {[...Array(6)].map((_, index) => (
              <NotionSkeleton key={`roadmap-skeleton-${index}`} type="card" />
            ))}
          </div>
        </div>
      ) : classicView ? (
        <ol style={{ display: 'grid', gap: 'var(--n-space-3)', listStyle: 'none', margin: 0, padding: 0 }}>
          {safeItems.map((item, index) => (
            <li key={item.id}>
              <RoadmapNode item={item} index={index} compact reducedMotion={reducedMotion} />
            </li>
          ))}
        </ol>
      ) : (
        <div
          style={{
            background:
              'radial-gradient(circle at 18% 0%, color-mix(in oklab, var(--n-accent-light) 68%, transparent), transparent 48%), radial-gradient(circle at 82% 0%, color-mix(in oklab, var(--n-reward-bg) 64%, transparent), transparent 44%), var(--n-bg-secondary)',
            border: '1px solid var(--n-border)',
            borderRadius: 'var(--n-radius-lg)',
            minHeight: `${canvasHeight}px`,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <RoadmapPath
            points={points.map((point) => ({ x: point.x, y: point.y, status: point.item.status }))}
            height={canvasHeight}
            reducedMotion={reducedMotion}
          />

          {points.map((point, index) => (
            <RoadmapNode
              key={point.item.id}
              item={point.item}
              index={index}
              xPercent={point.x}
              y={point.y}
              reducedMotion={reducedMotion}
            />
          ))}
        </div>
      )}
    </NotionCard>
  );
}

export type { RoadmapItem } from './Roadmap.types';
