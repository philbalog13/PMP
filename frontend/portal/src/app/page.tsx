'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getRoleRedirectUrl } from '@shared/lib/app-urls';
import { useAuth } from './auth/useAuth';
import {
  ArrowRight,
  ChevronRight,
  Terminal,
  BarChart3,
  Lock,
  Shield,
  Cpu,
  Users,
  Zap,
  CheckCircle2,
  TrendingUp,
  Globe,
  Activity,
  CreditCard,
  Key,
  Network,
  GraduationCap,
  Store,
  UserCircle,
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

// ── Types ──────────────────────────────────────────────────────────────
type ModuleColor = 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' | 'cyan';

interface LiveTx {
  id: string;
  amount: string;
  merchant: string;
  status: 'APPROVED' | 'DECLINED';
  code: string;
  ms: number;
}

// ── Live transactions ticker data ──────────────────────────────────────
const TX_POOL: LiveTx[] = [
  { id: 'TXN8F2A', amount: '142.50', merchant: 'Carrefour Market', status: 'APPROVED', code: '00', ms: 212 },
  { id: 'TXN3D91', amount: '38.00', merchant: 'Total Energie', status: 'APPROVED', code: '00', ms: 187 },
  { id: 'TXN7C44', amount: '890.00', merchant: 'Fnac Connect', status: 'DECLINED', code: '51', ms: 94 },
  { id: 'TXN1B03', amount: '25.90', merchant: 'Starbucks', status: 'APPROVED', code: '00', ms: 203 },
  { id: 'TXN5E72', amount: '1200.00', merchant: 'Air Algérie', status: 'APPROVED', code: '00', ms: 321 },
  { id: 'TXN9A18', amount: '55.00', merchant: 'BIO C Bon', status: 'APPROVED', code: '00', ms: 178 },
  { id: 'TXN2F67', amount: '300.00', merchant: 'Decathlon', status: 'DECLINED', code: '61', ms: 88 },
  { id: 'TXN6D34', amount: '15.00', merchant: 'Netflix', status: 'APPROVED', code: '00', ms: 155 },
];

// ── Utility ──────────────────────────────────────────────────────────--
function getDashboardHref(role: string | null): string {
  const redirectUrl = getRoleRedirectUrl(role);
  return redirectUrl === '/' ? '/login' : redirectUrl;
}

// ── Sub-components ─────────────────────────────────────────────────────

function LiveTicker() {
  const [items, setItems] = useState<LiveTx[]>(TX_POOL.slice(0, 4));
  const [highlight, setHighlight] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const next = TX_POOL[Math.floor(Math.random() * TX_POOL.length)];
      const fresh = { ...next, id: `TXN${Math.random().toString(36).substr(2, 4).toUpperCase()}`, ms: Math.floor(Math.random() * 200) + 80 };
      setItems(prev => [fresh, ...prev.slice(0, 3)]);
      setHighlight(fresh.id);
      setTimeout(() => setHighlight(null), 600);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-2">
      {items.map((tx) => (
        <div
          key={tx.id}
          className={`flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all duration-300 ${
            highlight === tx.id
              ? 'border-blue-500/50 bg-blue-500/10 scale-[1.01]'
              : 'border-white/5 bg-slate-800/40'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full ${tx.status === 'APPROVED' ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-red-400'}`} />
            <span className="text-[11px] font-mono text-slate-400">{tx.id}</span>
            <span className="text-[11px] text-slate-300 font-medium">{tx.merchant}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[11px] font-mono text-white font-bold">{tx.amount} €</span>
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
              tx.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
            }`}>{tx.code}</span>
            <span className="text-[10px] text-slate-600 font-mono">{tx.ms}ms</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const duration = 1800;
        const start = performance.now();
        const animate = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.floor(eased * target));
          if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <div ref={ref}>{count}{suffix}</div>;
}

function StatCard({ value, suffix, label, icon }: { value: number; suffix?: string; label: string; icon: ReactNode }) {
  return (
    <div className="group relative p-6 rounded-2xl bg-slate-900/60 border border-white/5 hover:border-white/10 transition-all duration-500 hover:-translate-y-1 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="flex items-start justify-between mb-3">
        <div className="text-slate-500">{icon}</div>
        <TrendingUp size={12} className="text-emerald-500 opacity-60" />
      </div>
      <div className="text-3xl font-black text-white tabular-nums tracking-tight">
        <AnimatedCounter target={value} suffix={suffix} />
      </div>
      <div className="text-xs text-slate-500 font-medium mt-1 uppercase tracking-widest">{label}</div>
    </div>
  );
}

function RoleCard({
  href, icon, title, subtitle, desc, color, badge
}: {
  href: string; icon: ReactNode; title: string; subtitle: string; desc: string;
  color: string; badge: string;
}) {
  return (
    <Link href={href} className={`group relative p-7 rounded-3xl border transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl overflow-hidden ${color}`}>
      <div className="absolute top-3 right-3">
        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${badge}`}>{subtitle}</span>
      </div>
      <div className="mb-6 w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white tracking-tight mb-2">{title}</h3>
      <p className="text-sm leading-relaxed opacity-60 mb-5">{desc}</p>
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-70 group-hover:opacity-100 transition-opacity">
        Accéder <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
}

function FlowStep({ number, icon, title, desc, color }: { number: string; icon: ReactNode; title: string; desc: string; color: string }) {
  return (
    <div className="flex gap-5 group">
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${color}`}>
          {number}
        </div>
        <div className="w-px flex-1 bg-gradient-to-b from-white/10 to-transparent mt-3" />
      </div>
      <div className="pb-10">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-slate-400">{icon}</span>
          <h4 className="text-white font-bold text-sm">{title}</h4>
        </div>
        <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function ServicePill({ icon, label, status }: { icon: ReactNode; label: string; status: 'live' | 'active' }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800/50 border border-white/5">
      <span className={`w-2 h-2 rounded-full animate-pulse ${status === 'live' ? 'bg-emerald-400' : 'bg-blue-400'}`} />
      <span className="text-slate-400">{icon}</span>
      <span className="text-xs font-medium text-slate-300">{label}</span>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────
export default function LandingPage() {
  const { isAuthenticated, isLoading, role } = useAuth(false);
  const dashboardHref = isAuthenticated ? getDashboardHref(role) : '/login';
  const [txCount, setTxCount] = useState(24_871);

  useEffect(() => {
    const t = setInterval(() => setTxCount(n => n + Math.floor(Math.random() * 3) + 1), 2200);
    return () => clearInterval(t);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex items-center gap-3">
          <Image src="/monetic-logo.svg" alt="MoneTIC" width={40} height={40} className="animate-pulse" />
          <div className="text-white font-bold tracking-tight">Chargement…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center pt-24 pb-16 px-6 overflow-hidden">
        {/* Background mesh */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-blue-600/8 rounded-full blur-[140px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600/8 rounded-full blur-[140px]" />
          {/* Grid lines */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:60px_60px]" />
        </div>

        <div className="max-w-7xl mx-auto w-full relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Text */}
            <div className="space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                <span className="text-blue-300 text-xs font-bold uppercase tracking-widest">Plateforme Monétique Live</span>
                <span className="text-blue-400/60 text-xs font-mono">{txCount.toLocaleString('fr-FR')} tx</span>
              </div>

              {/* Title */}
              <div className="space-y-3">
                <h1 className="text-5xl md:text-[64px] font-black leading-[1.0] tracking-tighter">
                  L&apos;infrastructure
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500">
                    bancaire réelle,
                  </span>
                  <br />
                  simulée.
                </h1>
                <p className="text-slate-400 text-lg leading-relaxed max-w-lg font-medium">
                  MoneTIC reproduit fidèlement les protocoles ISO&nbsp;8583, la cryptographie HSM
                  et les flux de paiement d&apos;une banque en production.
                </p>
              </div>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-3">
                {[
                  { icon: <Shield size={12} />, label: '3DS v2.2 intégré' },
                  { icon: <Key size={12} />, label: 'HSM LMK / ZMK' },
                  { icon: <Network size={12} />, label: 'Switch ISO 8583' },
                  { icon: <Activity size={12} />, label: 'Monitoring temps réel' },
                ].map(f => (
                  <div key={f.label} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/8 rounded-full text-xs text-slate-300 font-medium">
                    <span className="text-blue-400">{f.icon}</span>
                    {f.label}
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <Link
                  href={isAuthenticated ? dashboardHref : '/login'}
                  className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-xl shadow-blue-600/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:scale-95"
                >
                  {isAuthenticated ? 'Mon espace' : 'Commencer'}
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/documentation"
                  className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-2xl transition-all backdrop-blur-sm"
                >
                  Documentation
                </Link>
              </div>

              {/* Trust row */}
              <div className="flex items-center gap-6 pt-2 border-t border-white/5">
                {[
                  { v: '99.9%', l: 'Uptime' },
                  { v: '<250ms', l: 'Auth avg' },
                  { v: 'PCI-DSS', l: 'Compliant' },
                ].map(t => (
                  <div key={t.l} className="text-center">
                    <div className="text-white font-black text-sm font-mono">{t.v}</div>
                    <div className="text-slate-500 text-[10px] uppercase tracking-widest">{t.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Live terminal */}
            <div className="relative">
              <div className="absolute -inset-6 bg-gradient-to-br from-blue-600/15 to-purple-600/15 rounded-[60px] blur-[60px]" />
              <div className="relative bg-slate-900 border border-white/8 rounded-3xl overflow-hidden shadow-2xl shadow-black/60">
                {/* Terminal header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 bg-slate-800/50">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/30 border border-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/30 border border-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/30 border border-green-500/50" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">SWITCH — LIVE</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-600">ISO 8583:2003</div>
                </div>

                {/* Live feed */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Flux de transactions</span>
                    <span className="text-[10px] font-mono text-blue-400 animate-pulse">● LIVE</span>
                  </div>
                  <LiveTicker />
                </div>

                {/* Footer stats */}
                <div className="px-5 pb-5 grid grid-cols-3 gap-3">
                  {[
                    { l: 'MTI 0200', v: '12 req/s', c: 'text-blue-400' },
                    { l: 'Approved', v: '94.3%', c: 'text-emerald-400' },
                    { l: 'Avg latency', v: '187ms', c: 'text-amber-400' },
                  ].map(s => (
                    <div key={s.l} className="p-3 rounded-xl bg-slate-800/50 border border-white/5 text-center">
                      <div className={`text-sm font-black font-mono ${s.c}`}>{s.v}</div>
                      <div className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────── */}
      <section className="py-16 border-y border-white/5 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard value={15} suffix="+" label="Modules ISO 8583" icon={<Network size={18} />} />
          <StatCard value={12} label="Ateliers guidés" icon={<GraduationCap size={18} />} />
          <StatCard value={4} label="Rôles utilisateurs" icon={<Users size={18} />} />
          <StatCard value={100} suffix="%" label="Open Compliance" icon={<CheckCircle2 size={18} />} />
        </div>
      </section>

      {/* ── RÔLES ────────────────────────────────────────────────────── */}
      <section className="py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-16 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-px w-12 bg-blue-500" />
              <span className="text-blue-400 text-xs font-black uppercase tracking-widest">Multi-acteurs</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter">
              Un écosystème complet.<br />
              <span className="text-slate-400">Chaque rôle, son espace.</span>
            </h2>
            <p className="text-slate-500 text-lg leading-relaxed">
              Clients, marchands, étudiants et formateurs — chacun accède à des outils calibrés pour son profil.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <RoleCard
              href="/login"
              icon={<UserCircle size={22} className="text-amber-400" />}
              title="Client Bancaire"
              subtitle="Espace Client"
              desc="Gérez vos cartes virtuelles, effectuez des paiements et consultez votre historique de transactions."
              color="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20 hover:border-amber-500/40 text-amber-100"
              badge="bg-amber-500/20 text-amber-300"
            />
            <RoleCard
              href="/login"
              icon={<Store size={22} className="text-purple-400" />}
              title="Marchand"
              subtitle="POS Terminal"
              desc="Simulez votre terminal de caisse, gérez vos transactions et analysez vos revenus marchands."
              color="bg-gradient-to-br from-purple-500/10 to-violet-500/5 border-purple-500/20 hover:border-purple-500/40 text-purple-100"
              badge="bg-purple-500/20 text-purple-300"
            />
            <RoleCard
              href="/login"
              icon={<GraduationCap size={22} className="text-emerald-400" />}
              title="Étudiant"
              subtitle="Cursus & CTF"
              desc="Parcourez les modules de formation, réalisez des CTF de sécurité et progressez en monétique."
              color="bg-gradient-to-br from-emerald-500/10 to-green-500/5 border-emerald-500/20 hover:border-emerald-500/40 text-emerald-100"
              badge="bg-emerald-500/20 text-emerald-300"
            />
            <RoleCard
              href="/login"
              icon={<Shield size={22} className="text-blue-400" />}
              title="Formateur"
              subtitle="Admin Pédago"
              desc="Administrez les étudiants, créez des exercices, pilotez les CTF et suivez la progression."
              color="bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-blue-500/20 hover:border-blue-500/40 text-blue-100"
              badge="bg-blue-500/20 text-blue-300"
            />
          </div>
        </div>
      </section>

      {/* ── ARCHITECTURE ─────────────────────────────────────────────── */}
      <section className="py-28 px-6 bg-slate-900/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-20 items-start">
            {/* Left: Services */}
            <div className="space-y-10">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-px w-12 bg-purple-500" />
                  <span className="text-purple-400 text-xs font-black uppercase tracking-widest">Architecture</span>
                </div>
                <h2 className="text-4xl font-black tracking-tighter">
                  Des briques bancaires<br />
                  <span className="text-slate-400">100% fonctionnelles.</span>
                </h2>
                <p className="text-slate-500 leading-relaxed">
                  Chaque service est une réplique exacte des composants utilisés en production,
                  interconnectés via les mêmes protocoles industriels.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <ServiceCard
                  href={process.env.NEXT_PUBLIC_TPE_URL || 'http://localhost:3001'}
                  icon={<Terminal size={20} className="text-blue-400" />}
                  title="TPE Web"
                  desc="Terminal de paiement virtuel ISO 8583"
                  color="border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/5"
                />
                <ServiceCard
                  href={process.env.NEXT_PUBLIC_MONITORING_URL || 'http://localhost:3082'}
                  icon={<BarChart3 size={20} className="text-emerald-400" />}
                  title="Monitoring"
                  desc="Flux, latences et alertes fraude"
                  color="border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/5"
                />
                <ServiceCard
                  href={process.env.NEXT_PUBLIC_HSM_URL || 'http://localhost:3006'}
                  icon={<Lock size={20} className="text-amber-400" />}
                  title="HSM Admin"
                  desc="Console crypto LMK/ZMK/PIN"
                  color="border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/5"
                />
                <ServiceCard
                  href="/api-docs"
                  icon={<Globe size={20} className="text-cyan-400" />}
                  title="API Gateway"
                  desc="Point d'entrée REST centralisé"
                  color="border-cyan-500/20 hover:border-cyan-500/40 hover:bg-cyan-500/5"
                />
              </div>

              {/* Live services status */}
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Services actifs</p>
                <div className="flex flex-wrap gap-2">
                  <ServicePill icon={<Cpu size={12} />} label="API Gateway :8000" status="live" />
                  <ServicePill icon={<Lock size={12} />} label="HSM Simulator :8008" status="live" />
                  <ServicePill icon={<CreditCard size={12} />} label="Card Service :8001" status="active" />
                  <ServicePill icon={<Activity size={12} />} label="Auth Engine :8006" status="live" />
                </div>
              </div>
            </div>

            {/* Right: Transaction flow */}
            <div className="space-y-6">
              <div className="p-7 rounded-3xl bg-slate-900 border border-white/8 shadow-xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">
                  Flux d&apos;une transaction de paiement
                </p>
                <div>
                  <FlowStep number="1" icon={<CreditCard size={14} />} title="Initiation TPE" desc="Le client tape sa carte. Le terminal construit un message ISO 8583 MTI 0200 avec les données chiffrées." color="bg-blue-500/20 text-blue-300" />
                  <FlowStep number="2" icon={<Network size={14} />} title="Routage Switch" desc="L'acquéreur transmet le message au réseau de switch qui l'achemine vers la banque émettrice." color="bg-purple-500/20 text-purple-300" />
                  <FlowStep number="3" icon={<Shield size={14} />} title="Validation 3DS & HSM" desc="L'émetteur vérifie l'authentification 3DS v2.2 et déchiffre le PIN block via le HSM (ZTPK/ZPEK)." color="bg-amber-500/20 text-amber-300" />
                  <FlowStep number="4" icon={<CheckCircle2 size={14} />} title="Autorisation & Réponse" desc="Le résultat (code 00 = approuvé) est renvoyé au TPE en MTI 0210. La transaction est enregistrée." color="bg-emerald-500/20 text-emerald-300" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECURITY FEATURES ────────────────────────────────────────── */}
      <section className="py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <div className="flex items-center justify-center gap-3">
              <div className="h-px w-12 bg-emerald-500" />
              <span className="text-emerald-400 text-xs font-black uppercase tracking-widest">Sécurité & Conformité</span>
              <div className="h-px w-12 bg-emerald-500" />
            </div>
            <h2 className="text-4xl font-black tracking-tighter">
              Les standards de l&apos;industrie.<br />
              <span className="text-slate-400">Sans compromis.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: <Shield size={28} className="text-blue-400" />,
                title: 'Authentification 3DS v2.2',
                desc: 'Protocole EMV 3-D Secure complet avec challenge frictionless, OTP et analyse de risque embarquée.',
                tags: ['EMV 3DS', 'ACS', 'Frictionless'],
                color: 'border-blue-500/20 hover:border-blue-500/30',
                glow: 'from-blue-500/5',
              },
              {
                icon: <Key size={28} className="text-amber-400" />,
                title: 'Cryptographie HSM',
                desc: 'Gestion des clés LMK, ZMK, ZTPK conforme Thales/nCipher. DES, Triple-DES et RSA-2048.',
                tags: ['AES-256', 'Triple-DES', 'PKI'],
                color: 'border-amber-500/20 hover:border-amber-500/30',
                glow: 'from-amber-500/5',
              },
              {
                icon: <Zap size={28} className="text-purple-400" />,
                title: 'Détection de Fraude',
                desc: 'Moteur de règles avec scoring en temps réel, VELOCITY_CHECK, GEO_CHECK et DEVICE_FINGERPRINT.',
                tags: ['ML Scoring', 'Rules Engine', 'SIEM'],
                color: 'border-purple-500/20 hover:border-purple-500/30',
                glow: 'from-purple-500/5',
              },
            ].map(f => (
              <div key={f.title} className={`group relative p-8 rounded-3xl bg-slate-900/60 border transition-all duration-500 hover:-translate-y-1 overflow-hidden ${f.color}`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${f.glow} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative z-10">
                  <div className="mb-5">{f.icon}</div>
                  <h3 className="text-lg font-bold text-white mb-3">{f.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-5">{f.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {f.tags.map(t => (
                      <span key={t} className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-slate-400">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────────────── */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="relative overflow-hidden rounded-[48px] bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 p-2">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] rounded-[46px]" />
            <div className="relative rounded-[46px] bg-gradient-to-br from-slate-950/90 to-slate-900/80 backdrop-blur-xl px-12 py-20 text-center space-y-10">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />

              <div className="space-y-5">
                <h2 className="text-5xl md:text-6xl font-black tracking-tighter">
                  Prêt à explorer<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                    l&apos;invisible ?
                  </span>
                </h2>
                <p className="text-slate-400 text-xl max-w-xl mx-auto leading-relaxed">
                  Rejoignez MoneTIC et maîtrisez les protocoles bancaires que personne n&apos;enseigne.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/login?mode=register"
                  className="group inline-flex items-center gap-3 px-10 py-4 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-2xl transition-all shadow-xl shadow-blue-500/30 hover:-translate-y-0.5"
                >
                  Créer un compte gratuit
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/about"
                  className="inline-flex items-center gap-3 px-10 py-4 bg-white/8 hover:bg-white/12 border border-white/15 text-white font-bold rounded-2xl transition-all"
                >
                  Notre vision
                </Link>
              </div>

              <div className="flex items-center justify-center gap-8 pt-4 border-t border-white/5">
                {[
                  { icon: <CheckCircle2 size={14} className="text-emerald-400" />, label: 'Gratuit & Open Source' },
                  { icon: <Shield size={14} className="text-blue-400" />, label: 'Données sécurisées' },
                  { icon: <Zap size={14} className="text-amber-400" />, label: 'Démarrage immédiat' },
                ].map(f => (
                  <div key={f.label} className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                    {f.icon}
                    {f.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── ServiceCard ──────────────────────────────────────────────────────--
function ServiceCard({ href, icon, title, desc, color }: {
  href: string; icon: ReactNode; title: string; desc: string; color: string;
}) {
  return (
    <Link href={href} className={`group p-5 rounded-2xl bg-slate-900/60 border transition-all duration-300 hover:-translate-y-1 ${color}`}>
      <div className="mb-3 group-hover:scale-110 transition-transform duration-300">{icon}</div>
      <div className="text-sm font-bold text-white mb-1">{title}</div>
      <div className="text-xs text-slate-500 leading-snug">{desc}</div>
      <div className="flex items-center gap-1 mt-3 text-[10px] font-black uppercase tracking-wider text-slate-600 group-hover:text-slate-400 transition-colors">
        Ouvrir <ChevronRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}
