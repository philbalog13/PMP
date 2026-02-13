'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { getRoleRedirectUrl } from '@shared/lib/app-urls';
import { useAuth } from './auth/useAuth';
import {
  CreditCard,
  Shield,
  Cpu,
  ArrowRight,
  ChevronRight,
  Terminal,
  BarChart3,
  Lock,
  Zap,
  Users
} from 'lucide-react';

export default function LandingPage() {
  const { isAuthenticated, isLoading, role } = useAuth(false);
  const dashboardHref = isAuthenticated ? getDashboardHref(role) : '/login';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center animate-pulse">
          <CreditCard className="text-blue-500 animate-bounce" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-20 pb-20 px-6 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
        <div className="absolute top-40 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-40 right-10 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-blue-400 text-xs font-black uppercase tracking-widest backdrop-blur-md">
              <Zap size={14} className="fill-current" />
              L&apos;écosystème pédagogique industriel
            </div>

            <h1 className="text-6xl md:text-8xl font-black mb-8 leading-[0.9] tracking-tighter text-white">
              SIMULEZ <span className="text-blue-500 italic">L&apos;INVISIBLE</span><br />
              MAÎTRISEZ LE <span className="italic underline decoration-blue-500/30 underline-offset-8">FLUX.</span>
            </h1>

            <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium">
              Une plateforme ultra-haute fidélité pour explorer les protocoles bancaires,
              la cryptographie matérielle et sécuriser les infrastructures de paiement critiques.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4">
              <Link
                href={isAuthenticated ? dashboardHref : '/login'}
                className="group px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-2xl shadow-blue-500/40 flex items-center gap-3 active:scale-95"
              >
                {isAuthenticated ? 'Accéder à mon espace' : "Démarrer l'aventure"}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/demo"
                className="px-10 py-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-widest rounded-2xl transition-all flex items-center gap-3 active:scale-95 backdrop-blur-md"
              >
                <PlayIcon />
                Démo Interactive
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y border-white/5 bg-slate-900/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-12 text-center">
          <StatBox value="15+" label="Modules ISO8583" />
          <StatBox value="HSM v2" label="Hardware Crypto" />
          <StatBox value="12" label="Ateliers Guidés" />
          <StatBox value="100%" label="Open Compliance" />
        </div>
      </section>

      {/* Modules Grid */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end gap-10 mb-20">
            <div className="space-y-4">
              <div className="h-1 w-20 bg-blue-500 rounded-full" />
              <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-white">
                L&apos;Architecture <span className="text-blue-500">PMP.</span>
              </h2>
              <p className="text-slate-500 max-w-xl font-medium text-lg">
                Chaque service est une réplique exacte des briques bancaires réelles.
              </p>
            </div>
            <Link href="/lab" className="px-6 py-3 bg-white/5 rounded-xl border border-white/10 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 transition">
              Explorer l&apos;Infrastructure
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <ModuleCard
              href={process.env.NEXT_PUBLIC_TPE_URL || 'http://localhost:3001'}
              icon={<Terminal className="w-8 h-8" />}
              title="TPE Web"
              desc="Terminal de paiement virtuel complet. Débogage ISO8583 temps réel."
              color="blue"
            />
            <ModuleCard
              href={process.env.NEXT_PUBLIC_MONITORING_URL || 'http://localhost:3082'}
              icon={<BarChart3 className="w-8 h-8" />}
              title="Monitoring"
              desc="Flux de messages, latences de switch et alertes fraude."
              color="emerald"
            />
            <ModuleCard
              href={process.env.NEXT_PUBLIC_HSM_URL || 'http://localhost:3006'}
              icon={<Lock className="w-8 h-8" />}
              title="HSM Admin"
              desc="Console cryptographique. Gestion LMK/ZMK et PIN blocks."
              color="amber"
            />
          </div>
        </div>
      </section>

      {/* Feature Split */}
      <section className="py-32 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-24 items-center">
            <div className="space-y-16">
              <div className="space-y-6">
                <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-white leading-tight">
                  Technologie <span className="text-blue-500">Sans Compromis.</span>
                </h2>
                <p className="text-slate-400 text-xl font-medium leading-relaxed">
                  Découvrez comment les messages voyagent entre l&apos;acquéreur, l&apos;émetteur et le switch central.
                </p>
              </div>

              <div className="space-y-6">
                <FeatureRow
                  icon={<Shield className="text-blue-500" />}
                  title="Audit de Sécurité"
                  desc="Apprenez à identifier les vulnérabilités de rejeu et les attaques MITM."
                />
                <FeatureRow
                  icon={<Cpu className="text-purple-500" />}
                  title="Cryptographie"
                  desc="Décortiquez les algos DES, Triple-DES et RSA utilisés en production."
                />
                <FeatureRow
                  icon={<Users className="text-emerald-500" />}
                  title="Multi-Acteurs"
                  desc="Simulez des interactions complexes entre marchands et banques."
                />
              </div>
            </div>

            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/30 to-purple-600/30 rounded-[60px] blur-[100px] opacity-20 group-hover:opacity-40 transition duration-1000" />
              <div className="relative bg-slate-900 border border-white/10 rounded-[50px] p-12 backdrop-blur-3xl shadow-3xl shadow-black/50 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
                <div className="flex items-center gap-3 mb-10 border-b border-white/5 pb-6">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/40" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/40" />
                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/40" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-6">PROTO_DEBUG:ISO_0110_AUTH_REPLY</span>
                </div>
                <code className="text-sm md:text-base font-mono leading-relaxed space-y-2 block">
                  <span className="text-blue-400 block">{'{'}</span>
                  <span className="text-slate-500 block pl-4">{'"header": "ISO023400070",'}</span>
                  <span className="text-slate-300 block pl-4">
                    {'"mti": "'}
                    <span className="text-emerald-400">0110</span>
                    {'",'}
                  </span>
                  <span className="text-slate-500 block pl-4">{'"fields": {'}</span>
                  <span className="text-slate-400 block pl-8">{'"3": "000000",'}</span>
                  <span className="text-slate-400 block pl-8">
                    {'"39": "'}
                    <span className="text-emerald-500 font-black underline">00</span>
                    {'", '}
                    <span className="text-slate-600 text-[10px]">{'// APPROVED'}</span>
                  </span>
                  <span className="text-slate-400 block pl-8">{'"52": "BF72D1E5001A8...",'}</span>
                  <span className="text-slate-500 block pl-4">{'},'}</span>
                  <span className="text-slate-300 block pl-4">
                    {'"status": "'}
                    <span className="text-emerald-500 italic">SUCCESS</span>
                    {'"'}
                  </span>
                  <span className="text-blue-400 block">{'}'}</span>
                </code>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-40 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="p-20 rounded-[80px] bg-gradient-to-br from-blue-600/10 via-slate-900 to-purple-600/10 border border-white/5 backdrop-blur-3xl relative overflow-hidden group text-center space-y-12">
            <div className="absolute top-0 right-0 p-20 opacity-10 group-hover:opacity-20 transition duration-1000">
              <Shield size={400} className="text-blue-500" />
            </div>

            <div className="relative z-10 space-y-6">
              <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-white">
                DEVENEZ UN <span className="text-blue-500">EXPERT.</span>
              </h2>
              <p className="text-slate-400 text-2xl font-medium max-w-2xl mx-auto leading-relaxed">
                Le futur de la monétique commence par une compréhension profonde.
              </p>
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
              <Link
                href="/login?mode=register"
                className="px-12 py-5 bg-white text-slate-950 font-black uppercase tracking-widest rounded-3xl hover:bg-white/90 hover:scale-105 transition shadow-2xl flex items-center gap-3"
              >
                Créer un compte <ArrowRight size={20} />
              </Link>
              <Link
                href="/about"
                className="px-12 py-5 bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest rounded-3xl hover:bg-white/10 transition backdrop-blur-md"
              >
                Notre Vision
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function getDashboardHref(role: string | null): string {
  const redirectUrl = getRoleRedirectUrl(role);
  return redirectUrl === '/' ? '/login' : redirectUrl;
}

type ModuleColor = 'blue' | 'purple' | 'emerald' | 'amber';

type ModuleCardProps = {
  href: string;
  icon: ReactNode;
  title: string;
  desc: string;
  color: ModuleColor;
};

type FeatureRowProps = {
  icon: ReactNode;
  title: string;
  desc: string;
};

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="space-y-2 group">
      <div className="text-4xl font-black font-mono text-white italic tracking-tighter group-hover:text-blue-500 transition-colors duration-500">{value}</div>
      <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{label}</div>
    </div>
  );
}

function ModuleCard({ href, icon, title, desc, color }: ModuleCardProps) {
  const variants: Record<ModuleColor, string> = {
    blue: 'hover:border-blue-500/30 hover:bg-blue-500/5',
    purple: 'hover:border-purple-500/30 hover:bg-purple-500/5',
    emerald: 'hover:border-emerald-500/30 hover:bg-emerald-500/5',
    amber: 'hover:border-amber-500/30 hover:bg-amber-500/5',
  };

  const iconColors: Record<ModuleColor, string> = {
    blue: 'text-blue-500 bg-blue-500/10',
    purple: 'text-purple-500 bg-purple-500/10',
    emerald: 'text-emerald-500 bg-emerald-500/10',
    amber: 'text-amber-500 bg-amber-500/10',
  };

  return (
    <Link href={href} className={`p-10 rounded-[50px] bg-slate-900/50 border border-white/5 transition-all duration-700 group hover:-translate-y-4 ${variants[color]}`}>
      <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-8 group-hover:rotate-12 group-hover:scale-110 transition duration-500 ${iconColors[color]}`}>
        {icon}
      </div>
      <h3 className="text-2xl font-bold text-white mb-4 italic uppercase tracking-tight group-hover:translate-x-2 transition-transform">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed mb-8 font-medium">
        {desc}
      </p>
      <div className="flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-white transition-colors">
        Démarrer le module <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" />
      </div>
    </Link>
  );
}

function FeatureRow({ icon, title, desc }: FeatureRowProps) {
  return (
    <div className="flex items-start gap-8 group">
      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/10 group-hover:border-white/20 transition duration-500 group-hover:scale-110">
        {icon}
      </div>
      <div className="space-y-2">
        <h4 className="font-bold text-white italic tracking-tight uppercase text-lg">{title}</h4>
        <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-sm">{desc}</p>
      </div>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-blue-500">
      <path d="M5 3L19 12L5 21V3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}