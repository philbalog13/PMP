'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../auth/useAuth';
import {
    GraduationCap,
    Shield,
    BookOpen,
    Beaker,
    ChevronRight,
    Target,
    Zap,
    CheckCircle2,
} from 'lucide-react';
import { markOnboardingDoneLocally } from '../../../lib/onboarding';
import { FIRST_CTF_ROOM_CODE } from '../../../lib/ctf-code-map';
import { NotionCard } from '@shared/components/notion';

const STEPS = ['Bienvenue', 'Ton profil', 'Comment ça marche', 'Premier défi'] as const;

const LEVELS = [
    { value: 'NOVICE',        label: 'Débutant',      desc: 'Première approche des systèmes de paiement' },
    { value: 'INTERMEDIATE',  label: 'Intermédiaire', desc: 'Quelques notions de sécurité ou de monétique' },
    { value: 'ADVANCED',      label: 'Avancé',        desc: 'Expérience confirmée en sécurité ou systèmes bancaires' },
];

const OBJECTIVES = [
    { value: 'CERTIFICATION_PCI',      label: 'Certification PCI DSS',       Icon: Shield   },
    { value: 'RED_TEAM',               label: 'Red Team / Pentest paiements', Icon: Zap      },
    { value: 'BUSINESS_UNDERSTANDING', label: 'Comprendre la monétique',      Icon: BookOpen },
    { value: 'FINTECH_CAREER',         label: 'Reconversion Fintech',         Icon: Target   },
];

const HOW_ITEMS = [
    { Icon: BookOpen, label: 'Cursus (Théorie)',    desc: 'Des UA courtes sur EMV, 3DS, HSM, PCI DSS — chaque module se termine par un quiz.' },
    { Icon: Beaker,   label: 'CTF Labs (Hacking)',  desc: 'Exploite de vraies vulnérabilités sur un simulateur bancaire complet. Mode guidé ou libre.' },
    { Icon: Shield,   label: 'Ateliers (Pratique)', desc: 'Construis des PIN blocks, analyse des messages ISO 8583, simule des chargebacks.' },
];

/* ── Button style helpers ───────────────────────────────────────────────── */

const primaryBtn: React.CSSProperties = {
    width: '100%',
    padding: 'var(--n-space-3)',
    borderRadius: 'var(--n-radius-sm)',
    background: 'var(--n-accent)',
    color: '#fff',
    fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'],
    fontSize: 'var(--n-text-sm)',
    fontFamily: 'var(--n-font-sans)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--n-space-2)',
};

/* ── Component ─────────────────────────────────────────────────────────── */

export default function OnboardingPage() {
    const router = useRouter();
    const { user } = useAuth(true);
    const [step, setStep]           = useState(0);
    const [level, setLevel]         = useState('');
    const [objective, setObjective] = useState('');
    const [saving, setSaving]       = useState(false);

    const saveAndRedirect = async (destination: string) => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            if (token) {
                await fetch('/api/users/me/preferences', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        learnerLevel: level || undefined,
                        objective:    objective || undefined,
                        onboardingDone: true,
                    }),
                }).catch(() => {/* best effort */});
            }
            markOnboardingDoneLocally(user);
            router.push(destination);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ minHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--n-space-8) var(--n-space-6)' }}>

            {/* ── STEP INDICATOR ───────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', marginBottom: 'var(--n-space-8)' }}>
                {STEPS.map((s, i) => (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)' }}>
                        <div style={{
                            width:  i === step ? 34 : 28,
                            height: i === step ? 34 : 28,
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 'var(--n-text-xs)',
                            fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'],
                            fontFamily: 'var(--n-font-sans)',
                            transition: 'all 0.2s',
                            background: i === step ? 'var(--n-accent)' : i < step ? 'var(--n-success-bg)' : 'var(--n-bg-elevated)',
                            color:      i === step ? '#fff' : i < step ? 'var(--n-success)' : 'var(--n-text-tertiary)',
                            border: `2px solid ${i === step ? 'var(--n-accent)' : i < step ? 'var(--n-success-border)' : 'var(--n-border)'}`,
                        }}>
                            {i < step ? <CheckCircle2 size={14} /> : i + 1}
                        </div>
                        {i < STEPS.length - 1 && (
                            <div style={{ width: '32px', height: '1px', background: i < step ? 'var(--n-success-border)' : 'var(--n-border)' }} />
                        )}
                    </div>
                ))}
            </div>

            <div style={{ width: '100%', maxWidth: '480px' }}>

                {/* ── STEP 0 — Bienvenue ─────────────────────────── */}
                {step === 0 && (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ width: '72px', height: '72px', borderRadius: '18px', background: 'var(--n-accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--n-space-6)' }}>
                            <GraduationCap size={36} style={{ color: 'var(--n-accent)' }} />
                        </div>

                        <div style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-accent)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], fontFamily: 'var(--n-font-sans)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--n-space-3)' }}>
                            PMP Platform
                        </div>

                        <h1 style={{ fontSize: '28px', fontWeight: 'var(--n-weight-bold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-sans)', letterSpacing: '-0.02em', marginBottom: 'var(--n-space-3)' }}>
                            Learn by Hacking.
                        </h1>
                        <p style={{ fontSize: 'var(--n-text-base)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)', lineHeight: 'var(--n-leading-relaxed)', marginBottom: 'var(--n-space-7)' }}>
                            Tu apprends la sécurité des paiements en{' '}
                            <strong style={{ color: 'var(--n-text-primary)' }}>attaquant de vrais simulateurs bancaires</strong>.
                            Chaque vulnérabilité exploitée, tu dois ensuite la corriger.
                        </p>

                        {/* Feature chips */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--n-space-3)', marginBottom: 'var(--n-space-7)' }}>
                            {[
                                { Icon: BookOpen, label: 'Cursus' },
                                { Icon: Beaker,   label: 'CTF Labs' },
                                { Icon: Shield,   label: 'Ateliers' },
                            ].map(({ Icon, label }) => (
                                <NotionCard key={label} variant="default" padding="sm">
                                    <div style={{ textAlign: 'center', padding: 'var(--n-space-2)' }}>
                                        <Icon size={20} style={{ color: 'var(--n-accent)', margin: '0 auto var(--n-space-2)' }} />
                                        <p style={{ fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-sans)' }}>{label}</p>
                                    </div>
                                </NotionCard>
                            ))}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-3)' }}>
                            <button onClick={() => setStep(1)} style={primaryBtn}>
                                Commencer <ChevronRight size={16} />
                            </button>
                            <button
                                onClick={() => void saveAndRedirect('/student')}
                                style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)', background: 'none', border: 'none', cursor: 'pointer', padding: 'var(--n-space-2)' }}
                            >
                                Passer l&apos;introduction →
                            </button>
                        </div>
                    </div>
                )}

                {/* ── STEP 1 — Profil ────────────────────────────── */}
                {step === 1 && (
                    <div>
                        <div style={{ textAlign: 'center', marginBottom: 'var(--n-space-6)' }}>
                            <div style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-accent)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], fontFamily: 'var(--n-font-sans)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--n-space-2)' }}>Étape 2 / 4</div>
                            <h2 style={{ fontSize: '22px', fontWeight: 'var(--n-weight-bold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-sans)', letterSpacing: '-0.02em', marginBottom: 'var(--n-space-1)' }}>
                                Ton profil
                            </h2>
                            <p style={{ fontSize: 'var(--n-text-sm)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)' }}>
                                On adapte les labs et les indices à ton niveau.
                            </p>
                        </div>

                        {/* Level selection */}
                        <div style={{ marginBottom: 'var(--n-space-5)' }}>
                            <p style={{ fontSize: 'var(--n-text-xs)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--n-space-2)' }}>
                                Niveau actuel
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-2)' }}>
                                {LEVELS.map((l) => (
                                    <button
                                        key={l.value}
                                        onClick={() => setLevel(l.value)}
                                        style={{
                                            width: '100%', textAlign: 'left',
                                            borderRadius: 'var(--n-radius-sm)',
                                            padding: 'var(--n-space-4)',
                                            cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            fontFamily: 'var(--n-font-sans)',
                                            background: level === l.value ? 'var(--n-accent-light)' : 'var(--n-bg-primary)',
                                            border: `${level === l.value ? '2px' : '1px'} solid ${level === l.value ? 'var(--n-accent-border)' : 'var(--n-border)'}`,
                                        }}
                                    >
                                        <div>
                                            <p style={{ fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-primary)', marginBottom: '2px' }}>{l.label}</p>
                                            <p style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)' }}>{l.desc}</p>
                                        </div>
                                        {level === l.value && <CheckCircle2 size={18} style={{ color: 'var(--n-accent)', flexShrink: 0 }} />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Objective selection */}
                        <div style={{ marginBottom: 'var(--n-space-6)' }}>
                            <p style={{ fontSize: 'var(--n-text-xs)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--n-space-2)' }}>
                                Objectif principal
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--n-space-2)' }}>
                                {OBJECTIVES.map(({ value, label, Icon }) => (
                                    <button
                                        key={value}
                                        onClick={() => setObjective(value)}
                                        style={{
                                            textAlign: 'left',
                                            borderRadius: 'var(--n-radius-sm)',
                                            padding: 'var(--n-space-3)',
                                            cursor: 'pointer',
                                            fontFamily: 'var(--n-font-sans)',
                                            background: objective === value ? 'var(--n-accent-light)' : 'var(--n-bg-primary)',
                                            border: `${objective === value ? '2px' : '1px'} solid ${objective === value ? 'var(--n-accent-border)' : 'var(--n-border)'}`,
                                        }}
                                    >
                                        <Icon size={16} style={{ color: 'var(--n-accent)', marginBottom: 'var(--n-space-2)' }} />
                                        <p style={{ fontSize: 'var(--n-text-xs)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-primary)', lineHeight: 1.3 }}>{label}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={() => setStep(2)}
                            disabled={!level || !objective}
                            style={{ ...primaryBtn, opacity: (!level || !objective) ? 0.45 : 1, cursor: (!level || !objective) ? 'not-allowed' : 'pointer' }}
                        >
                            Continuer <ChevronRight size={16} />
                        </button>
                    </div>
                )}

                {/* ── STEP 2 — Comment ça marche ─────────────────── */}
                {step === 2 && (
                    <div>
                        <div style={{ textAlign: 'center', marginBottom: 'var(--n-space-6)' }}>
                            <div style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-accent)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], fontFamily: 'var(--n-font-sans)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--n-space-2)' }}>Étape 3 / 4</div>
                            <h2 style={{ fontSize: '22px', fontWeight: 'var(--n-weight-bold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-sans)', letterSpacing: '-0.02em', marginBottom: 'var(--n-space-1)' }}>
                                Comment ça marche
                            </h2>
                            <p style={{ fontSize: 'var(--n-text-sm)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)' }}>
                                Trois modes d&apos;apprentissage complémentaires.
                            </p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-3)', marginBottom: 'var(--n-space-5)' }}>
                            {HOW_ITEMS.map(({ Icon, label, desc }, i) => (
                                <NotionCard key={label} variant="default" padding="md">
                                    <div style={{ display: 'flex', gap: 'var(--n-space-4)', alignItems: 'flex-start' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: 'var(--n-radius-sm)', background: 'var(--n-accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <Icon size={18} style={{ color: 'var(--n-accent)' }} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
                                                Étape {i + 1}
                                            </div>
                                            <p style={{ fontSize: 'var(--n-text-sm)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-sans)', marginBottom: '4px' }}>{label}</p>
                                            <p style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)', lineHeight: 'var(--n-leading-relaxed)' }}>{desc}</p>
                                        </div>
                                    </div>
                                </NotionCard>
                            ))}
                        </div>

                        {/* Info callout */}
                        <div style={{ borderRadius: 'var(--n-radius-sm)', padding: 'var(--n-space-4)', marginBottom: 'var(--n-space-6)', background: 'var(--n-info-bg)', border: '1px solid var(--n-info-border)' }}>
                            <p style={{ fontSize: 'var(--n-text-xs)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--n-info)', fontFamily: 'var(--n-font-sans)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--n-space-1)' }}>
                                Le cycle Learn by Hacking
                            </p>
                            <p style={{ fontSize: 'var(--n-text-sm)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)', lineHeight: 'var(--n-leading-relaxed)' }}>
                                Théorie → Exploitation → Débrief → Patch → Vérification.
                                Chaque challenge t&apos;oblige à comprendre <em>pourquoi</em> la vulnérabilité existe.
                            </p>
                        </div>

                        <button onClick={() => setStep(3)} style={primaryBtn}>
                            J&apos;ai compris <ChevronRight size={16} />
                        </button>
                    </div>
                )}

                {/* ── STEP 3 — Premier défi ──────────────────────── */}
                {step === 3 && (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ width: '72px', height: '72px', borderRadius: '18px', background: 'var(--n-danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--n-space-6)', border: '1px solid var(--n-danger-border)' }}>
                            <Beaker size={36} style={{ color: 'var(--n-danger)' }} />
                        </div>

                        <div style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-accent)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], fontFamily: 'var(--n-font-sans)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--n-space-2)' }}>
                            Ton premier hack
                        </div>
                        <h2 style={{ fontSize: '22px', fontWeight: 'var(--n-weight-bold)' as React.CSSProperties['fontWeight'], color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-sans)', letterSpacing: '-0.02em', marginBottom: 'var(--n-space-3)' }}>
                            {FIRST_CTF_ROOM_CODE} : The Unsecured Payment Terminal
                        </h2>
                        <p style={{ fontSize: 'var(--n-text-sm)', color: 'var(--n-text-secondary)', fontFamily: 'var(--n-font-sans)', lineHeight: 'var(--n-leading-relaxed)', marginBottom: 'var(--n-space-6)' }}>
                            Le terminal de paiement envoie des transactions en clair et expose une surface admin vulnérable.
                            Ton objectif : <strong style={{ color: 'var(--n-text-primary)' }}>capturer le premier flag</strong> dans ce flux.
                        </p>

                        {/* Target callout */}
                        <div style={{ borderRadius: 'var(--n-radius-sm)', padding: 'var(--n-space-4)', marginBottom: 'var(--n-space-6)', background: 'var(--n-accent-light)', border: '1px solid var(--n-accent-border)', textAlign: 'left' }}>
                            <p style={{ fontSize: 'var(--n-text-xs)', fontWeight: 'var(--n-weight-semibold)' as React.CSSProperties['fontWeight'], color: 'var(--n-accent)', fontFamily: 'var(--n-font-sans)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--n-space-2)' }}>
                                Ta cible
                            </p>
                            <p style={{ fontSize: 'var(--n-text-sm)', color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-mono)', background: 'var(--n-bg-elevated)', borderRadius: 'var(--n-radius-sm)', padding: 'var(--n-space-2) var(--n-space-3)', marginBottom: 'var(--n-space-2)' }}>
                                POST http://pos-terminal:8081/transactions/process
                            </p>
                            <p style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)' }}>
                                Observe le trafic et valide l&apos;exposition de données sensibles.
                            </p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--n-space-3)' }}>
                            <button
                                onClick={() => void saveAndRedirect(`/student/ctf/${FIRST_CTF_ROOM_CODE}`)}
                                disabled={saving}
                                style={{ ...primaryBtn, opacity: saving ? 0.6 : 1, cursor: saving ? 'default' : 'pointer' }}
                            >
                                {saving ? 'Démarrage…' : 'Lancer mon premier lab →'}
                            </button>
                            <button
                                onClick={() => void saveAndRedirect('/student')}
                                disabled={saving}
                                style={{ fontSize: 'var(--n-text-xs)', color: 'var(--n-text-tertiary)', fontFamily: 'var(--n-font-sans)', background: 'none', border: 'none', cursor: saving ? 'default' : 'pointer', padding: 'var(--n-space-2)' }}
                            >
                                Aller au dashboard d&apos;abord →
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
