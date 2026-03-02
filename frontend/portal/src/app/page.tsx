'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getRoleRedirectUrl } from '@shared/lib/app-urls';
import { useAuth } from './auth/useAuth';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Globe,
  GraduationCap,
  Key,
  Lock,
  Network,
  Shield,
  Store,
  Terminal,
  UserCircle,
  Users,
  Zap,
} from 'lucide-react';
import { BankBadge } from '@shared/components/banking/primitives/BankBadge';
import { BankSpinner } from '@shared/components/banking/primitives/BankSpinner';
import { StatCard } from '@shared/components/banking/data-display/StatCard';

type LiveTx = {
  id: string;
  merchant: string;
  amount: string;
  status: 'APPROVED' | 'DECLINED';
  code: string;
};

const TX_POOL: LiveTx[] = [
  { id: 'TXN8F2A', merchant: 'Carrefour', amount: '142.50 EUR', status: 'APPROVED', code: '00' },
  { id: 'TXN3D91', merchant: 'Total', amount: '38.00 EUR', status: 'APPROVED', code: '00' },
  { id: 'TXN7C44', merchant: 'Fnac', amount: '890.00 EUR', status: 'DECLINED', code: '51' },
  { id: 'TXN1B03', merchant: 'Starbucks', amount: '25.90 EUR', status: 'APPROVED', code: '00' },
];

function getDashboardHref(role: string | null): string {
  const redirectUrl = getRoleRedirectUrl(role);
  return redirectUrl === '/' ? '/login' : redirectUrl;
}

function LiveTicker() {
  const [items, setItems] = useState<LiveTx[]>(TX_POOL);
  useEffect(() => {
    const interval = setInterval(() => {
      const next = TX_POOL[Math.floor(Math.random() * TX_POOL.length)];
      setItems((prev) => [{ ...next, id: `TXN${Math.random().toString(36).slice(2, 6).toUpperCase()}` }, ...prev.slice(0, 3)]);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'grid', gap: 'var(--bank-space-2)' }}>
      {items.map((tx) => (
        <div
          key={tx.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--bank-space-2)',
            border: '1px solid var(--bank-border-subtle)',
            borderRadius: 'var(--bank-radius-md)',
            background: 'var(--bank-bg-surface)',
            padding: 'var(--bank-space-3)',
          }}
        >
          <div style={{ display: 'grid', gap: 2 }}>
            <span style={{ fontFamily: 'var(--bank-font-mono)', fontSize: 'var(--bank-text-xs)', color: 'var(--bank-text-secondary)' }}>{tx.id}</span>
            <span style={{ fontSize: 'var(--bank-text-sm)' }}>{tx.merchant}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--bank-space-2)' }}>
            <span style={{ fontFamily: 'var(--bank-font-mono)', fontSize: 'var(--bank-text-sm)' }}>{tx.amount}</span>
            <BankBadge variant={tx.status === 'APPROVED' ? 'success' : 'danger'} label={tx.code} dot />
          </div>
        </div>
      ))}
    </div>
  );
}

function RoleCard(props: { href: string; title: string; desc: string; icon: ReactNode }) {
  return (
    <Link
      href={props.href}
      className="bk-card bk-card--interactive"
      style={{ display: 'grid', gap: 'var(--bank-space-3)', textDecoration: 'none', color: 'inherit' }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 'var(--bank-radius-md)',
          background: 'color-mix(in srgb, var(--bank-accent) 15%, var(--bank-bg-elevated))',
          border: '1px solid var(--bank-border-subtle)',
          color: 'var(--bank-accent)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {props.icon}
      </div>
      <strong style={{ fontSize: 'var(--bank-text-base)' }}>{props.title}</strong>
      <p style={{ margin: 0, color: 'var(--bank-text-secondary)', fontSize: 'var(--bank-text-sm)', lineHeight: 1.5 }}>{props.desc}</p>
      <span style={{ fontSize: 'var(--bank-text-xs)', color: 'var(--bank-accent)', fontWeight: 700, textTransform: 'uppercase' }}>
        Acceder
      </span>
    </Link>
  );
}

function FlowItem(props: { n: string; title: string; desc: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 'var(--bank-space-3)', alignItems: 'start' }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          background: 'color-mix(in srgb, var(--bank-accent) 20%, var(--bank-bg-elevated))',
          border: '1px solid color-mix(in srgb, var(--bank-accent) 50%, transparent)',
          color: 'var(--bank-accent)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--bank-font-mono)',
          fontSize: 'var(--bank-text-xs)',
          fontWeight: 700,
        }}
      >
        {props.n}
      </div>
      <div style={{ display: 'grid', gap: 4 }}>
        <strong style={{ fontSize: 'var(--bank-text-sm)' }}>{props.title}</strong>
        <p style={{ margin: 0, color: 'var(--bank-text-secondary)', fontSize: 'var(--bank-text-sm)', lineHeight: 1.5 }}>{props.desc}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { isAuthenticated, isLoading, role } = useAuth(false);
  const dashboardHref = isAuthenticated ? getDashboardHref(role) : '/login';
  const [txCount, setTxCount] = useState(24871);

  useEffect(() => {
    const interval = setInterval(() => setTxCount((value) => value + Math.floor(Math.random() * 3) + 1), 2200);
    return () => clearInterval(interval);
  }, []);

  const heroCtaHref = useMemo(() => (isAuthenticated ? dashboardHref : '/login'), [dashboardHref, isAuthenticated]);

  if (isLoading) {
    return (
      <div data-bank-theme="dark" data-bank-role="merchant" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--bank-space-3)' }}>
          <Image src="/monetic-logo.svg" alt="MoneTIC" width={40} height={40} />
          <BankSpinner size={30} />
        </div>
      </div>
    );
  }

  return (
    <div data-bank-theme="dark" data-bank-role="merchant" style={{ minHeight: '100vh', background: 'var(--bank-bg-base)', color: 'var(--bank-text-primary)' }}>
      <main style={{ width: 'min(1320px, 92vw)', margin: '0 auto', padding: '96px 0 56px', display: 'grid', gap: '56px' }}>
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--bank-space-5)', alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: 'var(--bank-space-4)' }}>
            <BankBadge variant="accent" label={`Plateforme live • ${txCount.toLocaleString('fr-FR')} tx`} dot />
            <h1 style={{ margin: 0, fontSize: 'clamp(2rem, 4vw, 4rem)', lineHeight: 1.04, letterSpacing: '-0.03em' }}>
              Infrastructure bancaire realiste
              <span style={{ display: 'block', color: 'var(--bank-accent)' }}> pour apprendre en conditions reelles</span>
            </h1>
            <p style={{ margin: 0, color: 'var(--bank-text-secondary)', fontSize: 'var(--bank-text-base)', lineHeight: 1.65 }}>
              MoneTIC simule les flux ISO 8583, la cryptographie HSM et les parcours d autorisation pour clients, marchands et formateurs.
            </p>
            <div style={{ display: 'flex', gap: 'var(--bank-space-2)', flexWrap: 'wrap' }}>
              <Link href={heroCtaHref} className="bk-btn bk-btn--primary" style={{ textDecoration: 'none' }}>
                {isAuthenticated ? 'Mon espace' : 'Commencer'}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link href="/documentation" className="bk-btn bk-btn--ghost" style={{ textDecoration: 'none' }}>
                Documentation
              </Link>
            </div>
            <div style={{ display: 'flex', gap: 'var(--bank-space-2)', flexWrap: 'wrap' }}>
              <BankBadge variant="success" label="Uptime 99.9%" />
              <BankBadge variant="info" label="Auth < 250ms" />
              <BankBadge variant="warning" label="PCI-DSS aligned" />
            </div>
          </div>

          <article className="bk-card" style={{ display: 'grid', gap: 'var(--bank-space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="bk-label-upper">Flux transactions</span>
              <BankBadge variant="success" label="LIVE" dot />
            </div>
            <LiveTicker />
          </article>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--bank-space-4)' }}>
          <StatCard label="Modules ISO 8583" value="15+" icon={Network} index={0} />
          <StatCard label="Ateliers guides" value="12" icon={GraduationCap} index={1} />
          <StatCard label="Roles utilises" value="4" icon={Users} index={2} />
          <StatCard label="Open compliance" value="100%" icon={CheckCircle2} accent index={3} />
        </section>

        <section style={{ display: 'grid', gap: 'var(--bank-space-4)' }}>
          <h2 style={{ margin: 0, fontSize: 'clamp(1.6rem, 2.6vw, 2.7rem)', letterSpacing: '-0.02em' }}>
            Un ecosysteme complet, un espace par role
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--bank-space-4)' }}>
            <RoleCard href="/login" title="Client bancaire" desc="Cartes virtuelles, paiements simules et historique client." icon={<UserCircle size={20} aria-hidden="true" />} />
            <RoleCard href="/login" title="Marchand" desc="Terminal POS, suivi transactionnel, clearing et telecollecte." icon={<Store size={20} aria-hidden="true" />} />
            <RoleCard href="/login" title="Etudiant" desc="Parcours pedagogiques, quiz et exercices de securite monetique." icon={<GraduationCap size={20} aria-hidden="true" />} />
            <RoleCard href="/login" title="Formateur" desc="Pilotage de cohortes, creation de labs et supervision." icon={<Shield size={20} aria-hidden="true" />} />
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--bank-space-4)' }}>
          <article style={{ display: 'grid', gap: 'var(--bank-space-3)' }}>
            <h2 style={{ margin: 0, fontSize: 'clamp(1.5rem, 2.4vw, 2.3rem)', letterSpacing: '-0.02em' }}>
              Briques bancaires connectees
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--bank-space-3)' }}>
              <RoleCard href={process.env.NEXT_PUBLIC_TPE_URL || 'http://localhost:3001'} title="TPE Web" desc="Terminal de paiement virtuel" icon={<Terminal size={18} aria-hidden="true" />} />
              <RoleCard href={process.env.NEXT_PUBLIC_MONITORING_URL || 'http://localhost:3082'} title="Monitoring" desc="Latence et alertes fraude" icon={<BarChart3 size={18} aria-hidden="true" />} />
              <RoleCard href={process.env.NEXT_PUBLIC_HSM_URL || 'http://localhost:3006'} title="HSM Admin" desc="LMK, ZMK et operations PIN" icon={<Lock size={18} aria-hidden="true" />} />
              <RoleCard href="/api-docs" title="API Gateway" desc="Point d entree REST unifie" icon={<Globe size={18} aria-hidden="true" />} />
            </div>
            <div style={{ display: 'flex', gap: 'var(--bank-space-2)', flexWrap: 'wrap' }}>
              <BankBadge variant="success" label="API :8000" dot />
              <BankBadge variant="success" label="HSM :8008" dot />
              <BankBadge variant="pending" label="Card :8001" dot />
              <BankBadge variant="success" label="Auth :8006" dot />
            </div>
          </article>

          <article className="bk-card" style={{ display: 'grid', gap: 'var(--bank-space-3)' }}>
            <h3 style={{ margin: 0, fontSize: 'var(--bank-text-lg)' }}>Cycle transactionnel en 4 etapes</h3>
            <FlowItem n="1" title="Initiation terminal" desc="Le TPE construit une requete ISO 8583 MTI 0200." />
            <FlowItem n="2" title="Routage switch" desc="L acquereur relaie vers le reseau et la banque emettrice." />
            <FlowItem n="3" title="Controle securite" desc="Validation 3DS, checks fraude et verification cryptographique." />
            <FlowItem n="4" title="Decision et reponse" desc="Retour MTI 0210 avec code 00 ou motif de refus." />
          </article>
        </section>

        <section style={{ display: 'grid', gap: 'var(--bank-space-4)' }}>
          <h2 style={{ margin: 0, fontSize: 'clamp(1.5rem, 2.4vw, 2.3rem)', textAlign: 'center' }}>Standards de securite integres</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--bank-space-4)' }}>
            <RoleCard href="/about" title="3DS v2.2" desc="Challenge OTP, parcours frictionless, gestion du risque." icon={<Shield size={20} aria-hidden="true" />} />
            <RoleCard href="/about" title="Cryptographie HSM" desc="Gestion de cles LMK/ZMK, operations PIN securisees." icon={<Key size={20} aria-hidden="true" />} />
            <RoleCard href="/about" title="Fraude temps reel" desc="Scoring velocity, regles metier et signaux comportementaux." icon={<Zap size={20} aria-hidden="true" />} />
          </div>
        </section>

        <section
          style={{
            border: '1px solid var(--bank-border-subtle)',
            borderRadius: 'var(--bank-radius-xl)',
            background: 'linear-gradient(145deg, color-mix(in srgb, var(--bank-accent) 14%, transparent), var(--bank-bg-surface))',
            padding: 'clamp(22px, 4vw, 48px)',
            display: 'grid',
            gap: 'var(--bank-space-4)',
            textAlign: 'center',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 'clamp(1.8rem, 3.6vw, 3.2rem)', lineHeight: 1.08 }}>
            Pret a explorer la monetique applicative ?
          </h2>
          <p style={{ margin: 0, color: 'var(--bank-text-secondary)' }}>
            Demarrez sur MoneTIC et simulez un flux bancaire complet de bout en bout.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--bank-space-2)', flexWrap: 'wrap' }}>
            <Link href="/login?mode=register" className="bk-btn bk-btn--primary" style={{ textDecoration: 'none' }}>
              Creer un compte
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link href="/about" className="bk-btn bk-btn--ghost" style={{ textDecoration: 'none' }}>
              Notre vision
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
