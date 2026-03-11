import type { ReactNode } from 'react';

export type RoadmapStatus = 'locked' | 'available' | 'current' | 'completed';

export interface RoadmapItem {
  id: string;
  title: string;
  subtitle?: string;
  status: RoadmapStatus;
  href?: string;
  icon?: ReactNode;
}

