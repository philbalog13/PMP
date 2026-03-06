'use client';

import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  ClipboardList,
  Flag,
  ShieldAlert,
  Award,
  CreditCard,
  MonitorPlay,
  KeyRound,
  BarChart3,
  GraduationCap,
} from 'lucide-react';
import { NotionSidebar, NavSection } from '@shared/components/notion/NotionSidebar';
import { useAuth } from '@/app/auth/useAuth';

/**
 * StudentSidebar — Sidebar spécifique aux pages /student/*
 * Sections : Apprentissage · Labs · Mon profil · Outils
 */
export function StudentSidebar() {
  const { user, logout } = useAuth();

  const sections: NavSection[] = [
    {
      title: 'Apprentissage',
      items: [
        {
          label: 'Tableau de bord',
          href: '/student',
          icon: LayoutDashboard,
        },
        {
          label: 'Cursus',
          href: '/student/cursus',
          icon: BookOpen,
        },
        {
          label: 'Progression',
          href: '/student/progress',
          icon: TrendingUp,
        },
        {
          label: 'Quizzes',
          href: '/student/quizzes',
          icon: ClipboardList,
        },
      ],
    },
    {
      title: 'Labs',
      items: [
        {
          label: 'CTF Challenges',
          href: '/student/ctf',
          icon: Flag,
        },
        {
          label: 'Defense Lab',
          href: '/student/defense',
          icon: ShieldAlert,
        },
      ],
    },
    {
      title: 'Mon espace',
      items: [
        {
          label: 'Badges',
          href: '/student/badges',
          icon: Award,
        },
        {
          label: 'Transactions',
          href: '/student/transactions',
          icon: CreditCard,
        },
      ],
    },
    {
      title: 'Outils externes',
      items: [
        {
          label: 'Labo TPE',
          href: 'http://localhost:3002',
          icon: MonitorPlay,
          external: true,
        },
        {
          label: 'Gestion cartes',
          href: 'http://localhost:3004',
          icon: CreditCard,
          external: true,
        },
        {
          label: 'Lab Cryptographie',
          href: 'http://localhost:3006',
          icon: KeyRound,
          external: true,
        },
        {
          label: 'Monitoring',
          href: 'http://localhost:3082',
          icon: BarChart3,
          external: true,
        },
      ],
    },
  ];

  return (
    <NotionSidebar
      logo={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '5px',
              background: 'var(--n-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <GraduationCap size={13} strokeWidth={2} style={{ color: 'white' }} />
          </div>
          <span
            style={{
              fontSize: 'var(--n-text-sm)',
              fontWeight: 'var(--n-weight-semibold)',
              color: 'var(--n-text-primary)',
              letterSpacing: 'var(--n-tracking-tight)',
            }}
          >
            MoneTIC
          </span>
        </div>
      }
      sections={sections}
      user={
        user
          ? {
              name: user.firstName
                ? `${user.firstName} ${user.lastName ?? ''}`.trim()
                : user.email,
              email: user.email,
              role: 'Étudiant',
              avatarLetter:
                user.firstName?.[0]?.toUpperCase() ??
                user.email?.[0]?.toUpperCase() ??
                'E',
            }
          : undefined
      }
      onLogout={logout}
    />
  );
}
