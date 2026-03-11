'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { Beaker, BookOpen, CheckCircle2, ChevronRight, GraduationCap, Shield, Target, Zap } from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import { markOnboardingDoneLocally } from '../../../lib/onboarding';
import { FIRST_CTF_ROOM_CODE } from '../../../lib/ctf-code-map';
import { NotionCard } from '@shared/components/notion';

const STEPS = ['Bienvenue', 'Profil', 'Methode', 'Premier lab'] as const;
const LEVELS = [
    { value: 'NOVICE', label: 'Debutant', desc: 'Premiere approche des systemes de paiement' },
    { value: 'INTERMEDIATE', label: 'Intermediaire', desc: 'Quelques notions de securite ou de monetique' },
    { value: 'ADVANCED', label: 'Avance', desc: 'Experience confirmee en securite ou systemes bancaires' },
];
const OBJECTIVES = [
    { value: 'CERTIFICATION_PCI', label: 'Certification PCI DSS', Icon: Shield },
    { value: 'RED_TEAM', label: 'Red Team / Pentest paiements', Icon: Zap },
    { value: 'BUSINESS_UNDERSTANDING', label: 'Comprendre la monetique', Icon: BookOpen },
    { value: 'FINTECH_CAREER', label: 'Reconversion Fintech', Icon: Target },
];
const HOW_ITEMS = [
    { Icon: BookOpen, label: 'Cursus', desc: 'UA courtes sur EMV, 3DS, HSM et PCI DSS avec quiz.' },
    { Icon: Beaker, label: 'CTF Labs', desc: 'Vraies vulnerabilites sur un simulateur bancaire complet.' },
    { Icon: Shield, label: 'Ateliers', desc: 'PIN blocks, ISO 8583, chargebacks et defense.' },
];

interface CurrentStudentProfile {
    id: string;
    email: string;
    onboardingDone: boolean;
    learnerLevel: string | null;
    objective: string | null;
}

const primaryBtn: CSSProperties = {
    width: '100%',
    padding: 'var(--n-space-3)',
    borderRadius: 'var(--n-radius-sm)',
    background: 'var(--n-accent)',
    color: '#fff',
    fontWeight: 'var(--n-weight-semibold)' as CSSProperties['fontWeight'],
    fontSize: 'var(--n-text-sm)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--n-space-2)',
};

export default function OnboardingPage() {
    const router = useRouter();
    useAuth(true);

    const [step, setStep] = useState(0);
    const [level, setLevel] = useState('');
    const [objective, setObjective] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const fetchCurrentProfile = async (token: string): Promise<CurrentStudentProfile> => {
        const response = await fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.user) {
            throw new Error(payload?.error || 'Impossible de charger le profil etudiant.');
        }
        return payload.user as CurrentStudentProfile;
    };

    useEffect(() => {
        let cancelled = false;
        const bootstrap = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;
            try {
                const profile = await fetchCurrentProfile(token);
                if (cancelled) return;
                setLevel(profile.learnerLevel || '');
                setObjective(profile.objective || '');
                if (profile.onboardingDone) {
                    markOnboardingDoneLocally({ id: profile.id, email: profile.email });
                    router.replace('/student');
                }
            } catch (error: unknown) {
                if (!cancelled) {
                    setSaveError(error instanceof Error ? error.message : 'Impossible de charger le profil etudiant.');
                }
            }
        };
        void bootstrap();
        return () => {
            cancelled = true;
        };
    }, [router]);

    const saveAndRedirect = async (destination: string) => {
        setSaving(true);
        setSaveError(null);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setSaveError('Session expiree. Merci de vous reconnecter.');
                return;
            }

            const response = await fetch('/api/users/me/preferences', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    learnerLevel: level || undefined,
                    objective: objective || undefined,
                    onboardingDone: true,
                }),
            });
            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(payload?.error || 'Impossible de sauvegarder les preferences.');
            }

            const profile = await fetchCurrentProfile(token);
            if (!profile.onboardingDone) {
                throw new Error('La sauvegarde serveur de l onboarding n a pas ete confirmee.');
            }

            markOnboardingDoneLocally({ id: profile.id, email: profile.email });
            router.push(destination);
        } catch (error: unknown) {
            setSaveError(error instanceof Error ? error.message : 'Impossible de terminer l onboarding.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ minHeight: 'calc(100vh - 48px)', display: 'grid', placeItems: 'center', padding: 'var(--n-space-8) var(--n-space-6)' }}>
            <div style={{ width: '100%', maxWidth: '560px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)', justifyContent: 'center', marginBottom: 'var(--n-space-6)' }}>
                    {STEPS.map((label, index) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--n-space-2)' }}>
                            <div style={{ width: 30, height: 30, borderRadius: '50%', display: 'grid', placeItems: 'center', background: index <= step ? 'var(--n-accent-light)' : 'var(--n-bg-elevated)', border: `1px solid ${index <= step ? 'var(--n-accent-border)' : 'var(--n-border)'}`, color: index < step ? 'var(--n-success)' : 'var(--n-text-primary)' }}>
                                {index < step ? <CheckCircle2 size={14} /> : index + 1}
                            </div>
                            {index < STEPS.length - 1 && <div style={{ width: 28, height: 1, background: 'var(--n-border)' }} />}
                        </div>
                    ))}
                </div>

                <NotionCard padding="lg">
                    {saveError && (
                        <div style={{ marginBottom: 'var(--n-space-4)', border: '1px solid var(--n-danger-border)', borderRadius: 'var(--n-radius-sm)', background: 'var(--n-danger-bg)', color: 'var(--n-danger)', padding: 'var(--n-space-3) var(--n-space-4)', fontSize: 'var(--n-text-sm)' }}>
                            {saveError}
                        </div>
                    )}

                    {step === 0 && (
                        <div style={{ display: 'grid', gap: 'var(--n-space-4)', textAlign: 'center' }}>
                            <div style={{ width: 72, height: 72, borderRadius: 18, background: 'var(--n-accent-light)', display: 'grid', placeItems: 'center', margin: '0 auto' }}>
                                <GraduationCap size={36} style={{ color: 'var(--n-accent)' }} />
                            </div>
                            <div style={{ color: 'var(--n-accent)', fontSize: 'var(--n-text-xs)', fontWeight: 'var(--n-weight-semibold)' as CSSProperties['fontWeight'], letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                PMP Platform
                            </div>
                            <h1 style={{ margin: 0, color: 'var(--n-text-primary)', fontSize: 28 }}>Learn by Hacking.</h1>
                            <p style={{ margin: 0, color: 'var(--n-text-secondary)', lineHeight: 'var(--n-leading-relaxed)' }}>
                                Tu apprends la securite des paiements en attaquant de vrais simulateurs bancaires. Chaque vulnerabilite exploitee doit ensuite etre comprise puis corrigee.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--n-space-3)' }}>
                                {[{ Icon: BookOpen, label: 'Cursus' }, { Icon: Beaker, label: 'CTF Labs' }, { Icon: Shield, label: 'Ateliers' }].map(({ Icon, label }) => (
                                    <NotionCard key={label} variant="default" padding="sm">
                                        <div style={{ display: 'grid', gap: 'var(--n-space-2)', textAlign: 'center' }}>
                                            <Icon size={20} style={{ color: 'var(--n-accent)', margin: '0 auto' }} />
                                            <span style={{ fontSize: 'var(--n-text-sm)', color: 'var(--n-text-primary)' }}>{label}</span>
                                        </div>
                                    </NotionCard>
                                ))}
                            </div>
                            <button onClick={() => setStep(1)} style={primaryBtn}>Commencer <ChevronRight size={16} /></button>
                            <button onClick={() => void saveAndRedirect('/student')} style={{ background: 'none', border: 'none', color: 'var(--n-text-tertiary)', fontSize: 'var(--n-text-xs)', cursor: 'pointer' }}>
                                Passer l&apos;introduction -&gt;
                            </button>
                        </div>
                    )}

                    {step === 1 && (
                        <div style={{ display: 'grid', gap: 'var(--n-space-5)' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ color: 'var(--n-accent)', fontSize: 'var(--n-text-xs)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Etape 2 / 4</div>
                                <h2 style={{ margin: 'var(--n-space-2) 0 0', color: 'var(--n-text-primary)' }}>Ton profil</h2>
                            </div>
                            <div style={{ display: 'grid', gap: 'var(--n-space-2)' }}>
                                {LEVELS.map((item) => (
                                    <button key={item.value} onClick={() => setLevel(item.value)} style={{ textAlign: 'left', borderRadius: 'var(--n-radius-sm)', padding: 'var(--n-space-4)', border: `${level === item.value ? '2px' : '1px'} solid ${level === item.value ? 'var(--n-accent-border)' : 'var(--n-border)'}`, background: level === item.value ? 'var(--n-accent-light)' : 'var(--n-bg-primary)', cursor: 'pointer' }}>
                                        <div style={{ color: 'var(--n-text-primary)', fontWeight: 'var(--n-weight-semibold)' as CSSProperties['fontWeight'] }}>{item.label}</div>
                                        <div style={{ color: 'var(--n-text-tertiary)', fontSize: 'var(--n-text-xs)' }}>{item.desc}</div>
                                    </button>
                                ))}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--n-space-2)' }}>
                                {OBJECTIVES.map(({ value, label, Icon }) => (
                                    <button key={value} onClick={() => setObjective(value)} style={{ textAlign: 'left', borderRadius: 'var(--n-radius-sm)', padding: 'var(--n-space-3)', border: `${objective === value ? '2px' : '1px'} solid ${objective === value ? 'var(--n-accent-border)' : 'var(--n-border)'}`, background: objective === value ? 'var(--n-accent-light)' : 'var(--n-bg-primary)', cursor: 'pointer' }}>
                                        <Icon size={16} style={{ color: 'var(--n-accent)', marginBottom: 'var(--n-space-2)' }} />
                                        <div style={{ color: 'var(--n-text-primary)', fontSize: 'var(--n-text-xs)' }}>{label}</div>
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setStep(2)} disabled={!level || !objective} style={{ ...primaryBtn, opacity: !level || !objective ? 0.45 : 1, cursor: !level || !objective ? 'not-allowed' : 'pointer' }}>
                                Continuer <ChevronRight size={16} />
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div style={{ display: 'grid', gap: 'var(--n-space-4)' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ color: 'var(--n-accent)', fontSize: 'var(--n-text-xs)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Etape 3 / 4</div>
                                <h2 style={{ margin: 'var(--n-space-2) 0 0', color: 'var(--n-text-primary)' }}>Comment ca marche</h2>
                            </div>
                            {HOW_ITEMS.map(({ Icon, label, desc }) => (
                                <NotionCard key={label} variant="default" padding="md">
                                    <div style={{ display: 'flex', gap: 'var(--n-space-3)', alignItems: 'flex-start' }}>
                                        <div style={{ width: 36, height: 36, borderRadius: 'var(--n-radius-sm)', background: 'var(--n-accent-light)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                                            <Icon size={18} style={{ color: 'var(--n-accent)' }} />
                                        </div>
                                        <div>
                                            <div style={{ color: 'var(--n-text-primary)', fontWeight: 'var(--n-weight-semibold)' as CSSProperties['fontWeight'] }}>{label}</div>
                                            <div style={{ color: 'var(--n-text-secondary)', fontSize: 'var(--n-text-sm)' }}>{desc}</div>
                                        </div>
                                    </div>
                                </NotionCard>
                            ))}
                            <button onClick={() => setStep(3)} style={primaryBtn}>J&apos;ai compris <ChevronRight size={16} /></button>
                        </div>
                    )}

                    {step === 3 && (
                        <div style={{ display: 'grid', gap: 'var(--n-space-4)', textAlign: 'center' }}>
                            <div style={{ width: 72, height: 72, borderRadius: 18, background: 'var(--n-danger-bg)', border: '1px solid var(--n-danger-border)', display: 'grid', placeItems: 'center', margin: '0 auto' }}>
                                <Beaker size={36} style={{ color: 'var(--n-danger)' }} />
                            </div>
                            <div style={{ color: 'var(--n-accent)', fontSize: 'var(--n-text-xs)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ton premier hack</div>
                            <h2 style={{ margin: 0, color: 'var(--n-text-primary)' }}>{FIRST_CTF_ROOM_CODE} : The Unsecured Payment Terminal</h2>
                            <p style={{ margin: 0, color: 'var(--n-text-secondary)', lineHeight: 'var(--n-leading-relaxed)' }}>
                                Le terminal envoie des transactions en clair et expose une surface admin vulnerable. Ton objectif est de capturer le premier flag.
                            </p>
                            <NotionCard variant="default" padding="md">
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ color: 'var(--n-accent)', fontSize: 'var(--n-text-xs)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ta cible</div>
                                    <div style={{ marginTop: 'var(--n-space-2)', color: 'var(--n-text-primary)', fontFamily: 'var(--n-font-mono)', fontSize: 'var(--n-text-sm)' }}>
                                        POST http://pos-terminal:8081/transactions/process
                                    </div>
                                </div>
                            </NotionCard>
                            <button onClick={() => void saveAndRedirect(`/student/ctf/${FIRST_CTF_ROOM_CODE}`)} disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.6 : 1, cursor: saving ? 'default' : 'pointer' }}>
                                {saving ? 'Demarrage...' : 'Lancer mon premier lab ->'}
                            </button>
                            <button onClick={() => void saveAndRedirect('/student')} disabled={saving} style={{ background: 'none', border: 'none', color: 'var(--n-text-tertiary)', fontSize: 'var(--n-text-xs)', cursor: saving ? 'default' : 'pointer' }}>
                                Aller au dashboard d&apos;abord -&gt;
                            </button>
                        </div>
                    )}
                </NotionCard>
            </div>
        </div>
    );
}
