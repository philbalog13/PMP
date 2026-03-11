'use client';

import React from 'react';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  CreditCard,
  BookOpen,
  Flag,
  Beaker,
  GraduationCap,
} from 'lucide-react';
import { NotionSidebar, NavSection } from '@shared/components/notion/NotionSidebar';
import { useAuth } from '@/app/auth/useAuth';

/**
 * InstructorSidebar — Sidebar spécifique aux pages /instructor/*
 * Sections : Tableau de bord · Cohorte · Pédagogie · Environnement
 */
export function InstructorSidebar() {
  const { user, logout } = useAuth();

  const sections: NavSection[] = [
    {
      title: 'Tableau de bord',
      items: [
        {
          label: 'Vue d\'ensemble',
          href: '/instructor',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: 'Cohorte',
      items: [
        {
          label: 'Étudiants',
          href: '/instructor/students',
          icon: Users,
        },
        {
          label: 'Analytics',
          href: '/instructor/analytics',
          icon: BarChart3,
        },
        {
          label: 'Transactions',
          href: '/instructor/transactions',
          icon: CreditCard,
        },
      ],
    },
    {
      title: 'Pédagogie',
      items: [
        {
          label: 'Exercices',
          href: '/instructor/exercises',
          icon: BookOpen,
        },
        {
          label: 'CTF Console',
          href: '/instructor/ctf',
          icon: Flag,
        },
      ],
    },
    {
      title: 'Environnement',
      items: [
        {
          label: 'Contrôle Lab',
          href: '/instructor/lab-control',
          icon: Beaker,
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
            MoneTIC · Formateur
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
              role: 'Formateur',
              avatarLetter:
                user.firstName?.[0]?.toUpperCase() ??
                user.email?.[0]?.toUpperCase() ??
                'F',
            }
          : undefined
      }
      onLogout={logout}
    />
  );
}
