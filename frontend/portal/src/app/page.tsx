import Link from 'next/link';
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
  type LucideIcon,
} from 'lucide-react';

import { BankBadge } from '@shared/components/banking/primitives/BankBadge';
import { StatCard } from '@shared/components/banking/data-display/StatCard';

type LiveTx = {
  id: string;
  merchant: string;
  amount: string;
  status: 'APPROVED' | 'DECLINED';
  code: string;
};

const LIVE_TX_ITEMS: LiveTx[] = [
  { id: 'TXN8F2A', merchant: 'Carrefour', amount: '142.50 EUR', status: 'APPROVED', code: '00' },
  { id: 'TXN3D91', merchant: 'Total', amount: '38.00 EUR', status: 'APPROVED', code: '00' },
  { id: 'TXN7C44', merchant: 'Fnac', amount: '890.00 EUR', status: 'DECLINED', code: '51' },
  { id: 'TXN1B03', merchant: 'Starbucks', amount: '25.90 EUR', status: 'APPROVED', code: '00' },
];

function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function LiveTicker() {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {LIVE_TX_ITEMS.map((tx) => (
        <article
          key={tx.id}
          className="portal-home-surface"
          style={{
            padding: '10px 12px',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <div style={{ display: 'grid', gap: 2 }}>
            <span style={{ fontFamily: 'var(--bank-font-mono)', fontSize: 12, color: '#b7c3d6' }}>{tx.id}</span>
            <span style={{ fontSize: 14, color: 'var(--bank-text-primary)' }}>{tx.merchant}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--bank-font-mono)', fontSize: 13, color: 'var(--bank-text-primary)' }}>
              {tx.amount}
            </span>
            <BankBadge variant={tx.status === 'APPROVED' ? 'success' : 'danger'} label={tx.code} dot />
          </div>
        </article>
      ))}
    </div>
  );
}

function RoleCard(props: { href: string; title: string; desc: string; icon: LucideIcon }) {
  const Icon = props.icon;

  if (isExternalHref(props.href)) {
    return (
      <a className="portal-home-role-card" href={props.href} target="_blank" rel="noreferrer noopener">
        <span className="portal-home-role-icon" aria-hidden="true">
          <Icon size={20} aria-hidden="true" />
        </span>
        <strong style={{ fontSize: 16, color: 'var(--bank-text-primary)' }}>{props.title}</strong>
        <p style={{ margin: 0, color: 'var(--bank-text-secondary)', fontSize: 14, lineHeight: 1.58 }}>{props.desc}</p>
        <span
          style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#9be6fb',
            fontWeight: 700,
          }}
        >
          Ouvrir
        </span>
      </a>
    );
  }

  return (
    <Link className="portal-home-role-card" href={props.href} prefetch={false}>
      <span className="portal-home-role-icon" aria-hidden="true">
        <Icon size={20} aria-hidden="true" />
      </span>
      <strong style={{ fontSize: 16, color: 'var(--bank-text-primary)' }}>{props.title}</strong>
      <p style={{ margin: 0, color: 'var(--bank-text-secondary)', fontSize: 14, lineHeight: 1.58 }}>{props.desc}</p>
      <span
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#9be6fb',
          fontWeight: 700,
        }}
      >
        Acceder
      </span>
    </Link>
  );
}

function FlowItem(props: { n: string; title: string; desc: string }) {
  return (
    <div className="portal-home-flow-item">
      <span className="portal-home-flow-num" aria-hidden="true">
        {props.n}
      </span>
      <div style={{ display: 'grid', gap: 4 }}>
        <strong style={{ fontSize: 14, color: 'var(--bank-text-primary)' }}>{props.title}</strong>
        <p style={{ margin: 0, color: 'var(--bank-text-secondary)', fontSize: 14, lineHeight: 1.58 }}>{props.desc}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="portal-home-root" data-bank-theme="dark" data-bank-role="merchant">
      <main className="portal-home-shell">
        <section className="portal-home-hero" aria-labelledby="portal-home-title">
          <article style={{ display: 'grid', gap: 16 }}>
            <BankBadge variant="accent" label="Plateforme live | 24 871 tx" dot />
            <h1 id="portal-home-title" style={{ margin: 0, fontSize: 'clamp(2rem, 4vw, 3.9rem)', lineHeight: 1.02, letterSpacing: '-0.03em' }}>
              L&apos;experience monetique
              <span style={{ display: 'block', color: '#67e8f9' }}>la plus realiste pour former et operer</span>
            </h1>
            <p style={{ margin: 0, color: 'var(--bank-text-secondary)', fontSize: 16, lineHeight: 1.7 }}>
              MoneTIC connecte les flux ISO 8583, les parcours pedagogiques et les outils operationnels dans une seule interface premium.
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link className="bk-btn bk-btn--primary" href="/login" prefetch={false} style={{ textDecoration: 'none' }}>
                Commencer
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link className="bk-btn bk-btn--ghost" href="/documentation" prefetch={false} style={{ textDecoration: 'none' }}>
                Documentation
              </Link>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <BankBadge variant="success" label="Uptime 99.9%" />
              <BankBadge variant="info" label="Auth sub-250ms" />
              <BankBadge variant="warning" label="PCI-DSS aligned" />
            </div>
          </article>

          <article className="portal-home-surface" style={{ padding: 16, display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span className="bk-label-upper" style={{ margin: 0 }}>
                Flux transactions
              </span>
              <BankBadge variant="success" label="LIVE" dot />
            </div>
            <LiveTicker />
          </article>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
          <StatCard label="Modules ISO 8583" value="15+" icon={Network} index={0} />
          <StatCard label="Ateliers guides" value="12" icon={GraduationCap} index={1} />
          <StatCard label="Roles actifs" value="4" icon={Users} index={2} />
          <StatCard label="Conformite ops" value="100%" icon={CheckCircle2} accent index={3} />
        </section>

        <section style={{ display: 'grid', gap: 14 }} aria-labelledby="roles-title">
          <h2 id="roles-title" className="portal-home-section-title">Un espace dedie pour chaque role</h2>
          <div className="portal-home-role-grid">
            <RoleCard
              href="/login"
              title="Client bancaire"
              desc="Cartes virtuelles, paiements simules, securite et historique."
              icon={UserCircle}
            />
            <RoleCard
              href="/login"
              title="Marchand"
              desc="Terminal POS, suivi transactionnel, rapports et clearing."
              icon={Store}
            />
            <RoleCard
              href="/login"
              title="Etudiant"
              desc="Parcours, quiz, CTF et progression gamifiee."
              icon={GraduationCap}
            />
            <RoleCard
              href="/login"
              title="Formateur"
              desc="Pilotage de cohortes, supervision des labs et analytics."
              icon={Shield}
            />
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }} aria-labelledby="stack-title">
          <article style={{ display: 'grid', gap: 14 }}>
            <h2 id="stack-title" className="portal-home-section-title">Stack bancaire connectee</h2>
            <div className="portal-home-role-grid">
              <RoleCard
                href={process.env.NEXT_PUBLIC_TPE_URL || 'http://localhost:3001'}
                title="TPE Web"
                desc="Terminal de paiement virtuel avec orchestration complete."
                icon={Terminal}
              />
              <RoleCard
                href={process.env.NEXT_PUBLIC_MONITORING_URL || 'http://localhost:3082'}
                title="Monitoring"
                desc="Latence, debit et alertes fraude en temps reel."
                icon={BarChart3}
              />
              <RoleCard
                href={process.env.NEXT_PUBLIC_HSM_URL || 'http://localhost:3006'}
                title="HSM Admin"
                desc="Gestion LMK/ZMK, operations PIN et journal crypto."
                icon={Lock}
              />
              <RoleCard
                href="/api-docs"
                title="API Gateway"
                desc="Catalogue REST unifie et documentation des endpoints."
                icon={Globe}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <BankBadge variant="success" label="API :8000" dot />
              <BankBadge variant="success" label="HSM :8008" dot />
              <BankBadge variant="pending" label="Card :8001" dot />
              <BankBadge variant="success" label="Auth :8006" dot />
            </div>
          </article>

          <article className="portal-home-surface" style={{ padding: 18, display: 'grid', gap: 14 }}>
            <h3 style={{ margin: 0, fontSize: 'clamp(1.1rem, 1.8vw, 1.4rem)' }}>Cycle transactionnel en 4 etapes</h3>
            <div className="portal-home-flow">
              <FlowItem n="1" title="Initiation terminal" desc="Le TPE prepare une requete ISO 8583 MTI 0200." />
              <FlowItem n="2" title="Routage switch" desc="Le flux est route vers reseau et banque emettrice." />
              <FlowItem n="3" title="Controle securite" desc="Checks 3DS, anti-fraude et verification cryptographique." />
              <FlowItem n="4" title="Decision" desc="Retour MTI 0210 avec code de reponse et traces." />
            </div>
          </article>
        </section>

        <section style={{ display: 'grid', gap: 14 }} aria-labelledby="security-title">
          <h2 id="security-title" className="portal-home-section-title" style={{ textAlign: 'center' }}>
            Standards de securite integres
          </h2>
          <div className="portal-home-role-grid">
            <RoleCard
              href="/about"
              title="3DS v2.2"
              desc="Challenge OTP, frictionless flow et scoring risque dynamique."
              icon={Shield}
            />
            <RoleCard
              href="/about"
              title="Cryptographie HSM"
              desc="Gestion de cles, operations PIN et segregation stricte."
              icon={Key}
            />
            <RoleCard
              href="/about"
              title="Fraude temps reel"
              desc="Velocity checks, signaux comportementaux et regles metier."
              icon={Zap}
            />
          </div>
        </section>

        <section className="portal-home-cta" aria-labelledby="portal-cta-title">
          <h2 id="portal-cta-title" style={{ margin: 0, fontSize: 'clamp(1.8rem, 3.7vw, 3rem)', lineHeight: 1.08 }}>
            Pret a lancer un flux monetique complet ?
          </h2>
          <p style={{ margin: 0, color: 'var(--bank-text-secondary)' }}>
            Activez votre espace et passez de la theorie a la simulation operationnelle en quelques secondes.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/login?mode=register" prefetch={false} className="bk-btn bk-btn--primary" style={{ textDecoration: 'none' }}>
              Creer un compte
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link href="/about" prefetch={false} className="bk-btn bk-btn--ghost" style={{ textDecoration: 'none' }}>
              Explorer la vision
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
