'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, BookOpen, CheckCircle2, ChevronRight, Shield } from 'lucide-react';
import { useAuth } from '../../../../auth/useAuth';
import { APP_URLS } from '@shared/lib/app-urls';
import { normalizeCtfCode } from '@/lib/ctf-code-map';
import { NotionSkeleton } from '@shared/components/notion';

type CtfStatus = 'LOCKED' | 'UNLOCKED' | 'IN_PROGRESS' | 'COMPLETED';

type ChallengeDetail = {
    code: string;
    title: string;
    description: string;
    category: string;
    difficulty: string;
    points: number;
    status: CtfStatus;
    vulnerabilityType: string;
    attackVector: string;
    learningObjectives: string[];
    targetService: string;
    targetEndpoint: string;
    freeModeDescription?: string;
};

const CATEGORY_LABELS: Record<string, string> = {
    HSM_ATTACK: 'HSM', REPLAY_ATTACK: 'Replay', '3DS_BYPASS': '3DS',
    FRAUD_CNP: 'Fraude CNP', ISO8583_MANIPULATION: 'ISO 8583', PIN_CRACKING: 'PIN',
    MITM: 'MITM', PRIVILEGE_ESCALATION: 'Privesc', CRYPTO_WEAKNESS: 'Crypto',
};

function remediationBlocks(category: string): Array<{ title: string; items: string[] }> {
    const key = String(category || '').trim().toUpperCase();

    if (key === 'REPLAY_ATTACK') return [
        { title: 'Correctifs serveur', items: ['Idempotency key obligatoire sur chaque requête', 'Nonce + fenêtre temporelle (TTL 60s)', 'Déduplication côté backend avec cache Redis', 'Vérifier STAN/RRN unique avant traitement'] },
        { title: 'Observabilité', items: ['Tracer STAN/RRN/nonce dans les logs structurés', 'Alerting sur taux de doublons > 1%', 'Métriques taux de rejouage par terminal/IP'] },
        { title: 'Validation', items: ['Tests e2e de rejeu avec même nonce', 'Tests de concurrence multi-thread', 'Rejeu sur plusieurs nœuds du cluster'] },
    ];

    if (key === 'HSM_ATTACK') return [
        { title: 'Isolation réseau', items: ['Réseau privé (VLAN dédié) uniquement', 'Allowlist IP stricte sur le HSM', 'mTLS obligatoire entre services et HSM', 'Firewall layer 7 avec inspection des commandes'] },
        { title: 'Autorisation & Audit', items: ['RBAC granulaire sur chaque commande HSM', 'Séparation des environnements (prod ≠ test)', 'Journalisation complète de tous les appels HSM', 'Rotation planifiée des clés exposées'] },
        { title: 'Validation', items: ['Tests d\'accès non autorisé aux endpoints', 'Revue des endpoints admin/debug', 'Vérification que les clés ne sont pas exposées en clair'] },
    ];

    if (key === 'ISO8583_MANIPULATION') return [
        { title: 'Validation des messages', items: ['Schéma strict : valider chaque DE selon le MTI', 'Vérification des champs critiques (DE39, DE49, DE4)', 'Rejet des incohérences bitmap/DE', 'Contrôle de longueur LLVAR/LLLVAR'] },
        { title: 'Protection d\'intégrité', items: ['MAC obligatoire (DE64/DE128) sur tous les messages', 'Contrôle de rejeu (STAN unique + timestamp)', 'Rate limit par terminal/acquéreur', 'Validation croisée montant/devise/merchant'] },
        { title: 'Tests', items: ['Fuzzing des champs ISO 8583', 'Cas limites : longueur max, caractères spéciaux', 'Tests de rejet de messages malformés'] },
    ];

    if (key === '3DS_BYPASS') return [
        { title: 'Correctifs protocolaires', items: ['Forcer 3DS sur toutes les transactions > seuil SCA', 'Valider le cavv/eci serveur-side (pas côté client)', 'Rejeter les ECI 07 (3DS non disponible) au-dessus du seuil', 'Vérifier la cohérence transaction ID entre AReq et ARes'] },
        { title: 'Surveillance', items: ['Alerter sur taux d\'ECI 07 anormal par commerçant', 'Monitorer les downgrades 3DS2 → 3DS1', 'Tracer les échecs d\'authentification par BIN range'] },
        { title: 'Validation', items: ['Tests de contournement 3DS avec ECI modifié', 'Tests de replay du cavv', 'Vérification de la chaîne de confiance DS → ACS'] },
    ];

    if (key === 'FRAUD_CNP') return [
        { title: 'Détection', items: ['Moteur de scoring temps réel (vélocité, device, géo)', 'Device fingerprinting côté client', 'Vérification d\'adresse (AVS) et CVV obligatoire', 'Analyse du comportement de navigation (session duration, mouse patterns)'] },
        { title: 'Prévention', items: ['3-D Secure 2.x avec challenge adaptatif', 'Limites de vélocité par carte/IP/device', 'Blocklist d\'emails jetables et de BIN à risque', 'Machine learning : détection d\'anomalies en temps réel'] },
        { title: 'Réponse', items: ['Workflow de review pour scores intermédiaires', 'Chargeback représentation avec preuves', 'Partage de renseignements fraude (schemes, consortiums)'] },
    ];

    if (key === 'PIN_CRACKING') return [
        { title: 'Protection du PIN', items: ['PIN block ISO 9564 format 4 (AES)', 'DUKPT pour dérivation unique par transaction', 'Chiffrement point-to-point (P2PE) dès le terminal', 'Zéroïsation immédiate après vérification'] },
        { title: 'Contrôle d\'accès', items: ['Limitation à 3 tentatives de PIN', 'Verrouillage de la carte après échecs consécutifs', 'RBAC strict sur les fonctions HSM de vérification PIN', 'Audit trail de chaque vérification PIN'] },
        { title: 'Tests', items: ['Test de brute force sur l\'API de vérification', 'Vérification que le PIN n\'apparaît pas dans les logs', 'Test de timing attack sur la réponse PIN OK/KO'] },
    ];

    if (key === 'MITM') return [
        { title: 'Chiffrement transport', items: ['TLS 1.3 obligatoire sur tous les flux', 'Certificate pinning côté client (mobile/terminal)', 'mTLS pour les communications inter-services', 'HSTS avec preload pour les interfaces web'] },
        { title: 'Intégrité des messages', items: ['MAC/HMAC sur les messages applicatifs', 'Vérification d\'intégrité end-to-end', 'Protection contre le downgrade de protocole', 'Signature des réponses serveur'] },
        { title: 'Détection', items: ['Monitoring des certificats (CT logs)', 'Alerting sur changement de certificat inattendu', 'Test d\'interception avec proxy MITM'] },
    ];

    if (key === 'PRIVILEGE_ESCALATION') return [
        { title: 'Contrôle d\'accès', items: ['RBAC strict avec principe du moindre privilège', 'Validation des rôles côté serveur (jamais côté client)', 'Vérification d\'ownership sur chaque ressource', 'JWT avec claims minimaux et validation stricte'] },
        { title: 'Protection', items: ['Rate limiting sur les endpoints admin', 'Séparation des API admin et utilisateur', 'Input validation et output encoding', 'Gestion d\'erreurs non bavarde (pas de stack traces)'] },
        { title: 'Audit', items: ['Journalisation de chaque action admin', 'Alerting sur changement de rôle', 'Tests IDOR sur toutes les ressources', 'Revue périodique des droits d\'accès'] },
    ];

    if (key === 'CRYPTO_WEAKNESS') return [
        { title: 'Algorithmes', items: ['AES-256-GCM pour le chiffrement symétrique', 'RSA ≥ 2048 bits ou ECC P-256 pour l\'asymétrique', 'SHA-256 minimum pour le hashing', 'Abandon de DES, 3DES, MD5, SHA-1'] },
        { title: 'Gestion des clés', items: ['HSM pour le stockage des clés en production', 'Rotation planifiée des clés (annuelle minimum)', 'Séparation des clés par environnement', 'Key derivation robuste (PBKDF2, Argon2, scrypt)'] },
        { title: 'Validation', items: ['Tests avec vecteurs de test officiels (NIST, ANSI)', 'Vérification de l\'entropie des IV/nonces', 'Audit de code pour les usages crypto hardcodés'] },
    ];

    return [
        { title: 'Correctifs', items: ['Validation côté serveur systématique', 'Contrôle d\'accès et ownership sur chaque ressource', 'Gestion d\'erreurs non bavarde (pas d\'information technique)'] },
        { title: 'Surveillance', items: ['Logs structurés avec correlation IDs', 'Alerting sur patterns anormaux', 'Dashboard de sécurité en temps réel'] },
        { title: 'Validation', items: ['Tests unitaires sur les contrôles de sécurité', 'Tests d\'intégration end-to-end', 'Revue sécurité périodique et pentest'] },
    ];
}

export default function CtfRemediationPage({ params }: { params: Promise<{ code: string }> }) {
    const { code } = use(params);
    const { isLoading: authLoading } = useAuth(true);

    const requestedCode = useMemo(
        () => normalizeCtfCode(decodeURIComponent(String(code || ''))),
        [code]
    );
    const normalizedCode = requestedCode;

    const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchChallenge = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) { setError('Session expirée. Merci de vous reconnecter.'); setLoading(false); return; }
        try {
            setError(null);
            setLoading(true);
            const res = await fetch(`/api/ctf/challenges/${encodeURIComponent(normalizedCode)}?mode=FREE`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success || !data?.challenge) throw new Error(data?.error || 'Impossible de charger la remediation.');
            setChallenge(data.challenge);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur de chargement.');
        } finally {
            setLoading(false);
        }
    }, [normalizedCode]);

    useEffect(() => {
        if (authLoading) return;
        void fetchChallenge();
    }, [authLoading, fetchChallenge]);

    if (authLoading || loading) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--n-bg-secondary)', padding: '32px 24px' }}>
                <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <NotionSkeleton type="line" />
                    <NotionSkeleton type="card" />
                    <NotionSkeleton type="card" />
                </div>
            </div>
        );
    }

    if (!challenge) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--n-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
                <div style={{
                    maxWidth: '440px', width: '100%', padding: '20px 24px', borderRadius: '10px',
                    background: 'var(--n-danger-bg)', border: '1px solid var(--n-danger-border)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <AlertCircle size={18} style={{ color: 'var(--n-danger)', flexShrink: 0, marginTop: '1px' }} />
                        <div>
                            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--n-text-primary)', marginBottom: '4px' }}>
                                Impossible de charger
                            </h2>
                            <p style={{ fontSize: '13px', color: 'var(--n-danger)', marginBottom: '14px', lineHeight: 1.5 }}>
                                {error || 'Erreur inconnue.'}
                            </p>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button onClick={() => void fetchChallenge()}
                                    style={{
                                        padding: '7px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
                                        background: 'var(--n-accent)', color: '#fff', border: 'none', cursor: 'pointer',
                                    }}>
                                    Réessayer
                                </button>
                                <Link href={APP_URLS.studentCtf}
                                    style={{
                                        padding: '7px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
                                        background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)',
                                        color: 'var(--n-text-secondary)', textDecoration: 'none',
                                    }}>
                                    Retour
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const categoryLabel = CATEGORY_LABELS[challenge.category] || challenge.category;
    const blocks = remediationBlocks(challenge.category);
    const completed = challenge.status === 'COMPLETED';

    return (
        <div style={{ minHeight: '100vh', background: 'var(--n-bg-secondary)' }}>

            {/* ── Page header ── */}
            <div style={{
                background: 'var(--n-bg-primary)',
                borderBottom: '1px solid var(--n-border)',
                padding: '16px 24px',
            }}>
                {/* Breadcrumb */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--n-text-tertiary)', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <Link href="/student" style={{ color: 'var(--n-text-tertiary)', textDecoration: 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--n-accent)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--n-text-tertiary)')}>
                        Mon Parcours
                    </Link>
                    <ChevronRight size={11} />
                    <Link href={APP_URLS.studentCtf} style={{ color: 'var(--n-text-tertiary)', textDecoration: 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--n-accent)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--n-text-tertiary)')}>
                        Security Labs
                    </Link>
                    <ChevronRight size={11} />
                    <Link href={`${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}`}
                        style={{ color: 'var(--n-text-tertiary)', textDecoration: 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--n-accent)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--n-text-tertiary)')}>
                        {normalizedCode}
                    </Link>
                    <ChevronRight size={11} />
                    <span style={{ color: 'var(--n-text-secondary)' }}>Remédiation</span>
                </div>

                {/* Title row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                    <div>
                        <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--n-text-primary)', lineHeight: 1.2, marginBottom: '4px' }}>
                            Remédiation &amp; Correctifs
                        </h1>
                        <p style={{ fontSize: '13px', color: 'var(--n-text-secondary)' }}>{challenge.title}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {/* Meta pills */}
                        {[
                            { label: challenge.code },
                            { label: categoryLabel },
                            { label: challenge.difficulty },
                        ].map(({ label }) => (
                            <span key={label} style={{
                                fontSize: '11px', fontWeight: 500, padding: '3px 8px', borderRadius: '4px',
                                background: 'var(--n-bg-secondary)', border: '1px solid var(--n-border)',
                                color: 'var(--n-text-secondary)',
                            }}>
                                {label}
                            </span>
                        ))}
                        <span style={{
                            fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px',
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            background: completed ? 'var(--n-success-bg)' : 'var(--n-warning-bg)',
                            border: `1px solid ${completed ? 'var(--n-success-border)' : 'var(--n-warning-border)'}`,
                            color: completed ? 'var(--n-success)' : 'var(--n-warning)',
                        }}>
                            {completed ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                            {completed ? 'Résolu' : 'Non résolu'}
                        </span>
                        <Link href={APP_URLS.studentCtf}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                                background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)',
                                color: 'var(--n-text-secondary)', textDecoration: 'none',
                            }}>
                            <ArrowLeft size={12} /> Dashboard CTF
                        </Link>
                    </div>
                </div>
            </div>

            {/* ── Content ── */}
            <div style={{ maxWidth: '720px', margin: '0 auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Not completed callout */}
                {!completed && (
                    <div style={{
                        padding: '14px 16px', borderRadius: '8px',
                        background: 'var(--n-warning-bg)', border: '1px solid var(--n-warning-border)',
                        display: 'flex', alignItems: 'flex-start', gap: '10px',
                    }}>
                        <AlertCircle size={15} style={{ color: 'var(--n-warning)', marginTop: '1px', flexShrink: 0 }} />
                        <div>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--n-warning)', marginBottom: '2px' }}>
                                Remédiation disponible après résolution
                            </p>
                            <p style={{ fontSize: '12px', color: 'var(--n-warning)', lineHeight: 1.5, opacity: 0.85 }}>
                                Terminez le challenge, puis revenez ici pour valider les correctifs.
                            </p>
                        </div>
                    </div>
                )}

                {/* Vulnerability summary */}
                <div style={{
                    background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)',
                    borderRadius: '8px', padding: '16px',
                }}>
                    <h2 style={{
                        fontSize: '13px', fontWeight: 600, color: 'var(--n-text-primary)',
                        display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px',
                    }}>
                        <BookOpen size={14} style={{ color: 'var(--n-accent)' }} />
                        Résumé de la vulnérabilité
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[
                            { label: 'Vulnérabilité', value: challenge.vulnerabilityType },
                            { label: 'Vecteur d\'attaque', value: challenge.attackVector },
                            { label: 'Endpoint cible', value: challenge.targetEndpoint, mono: true, sub: `Service: ${challenge.targetService}` },
                        ].map(({ label, value, mono, sub }) => (
                            <div key={label} style={{
                                padding: '10px 12px', borderRadius: '6px',
                                background: 'var(--n-bg-secondary)', border: '1px solid var(--n-border)',
                            }}>
                                <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--n-text-tertiary)', marginBottom: '3px' }}>
                                    {label}
                                </p>
                                <p style={{ fontSize: '13px', color: 'var(--n-text-primary)', fontFamily: mono ? 'var(--n-font-mono)' : undefined, whiteSpace: mono ? 'pre-wrap' : undefined }}>
                                    {value}
                                </p>
                                {sub && <p style={{ fontSize: '11px', color: 'var(--n-text-tertiary)', marginTop: '2px' }}>{sub}</p>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Remediation blocks */}
                {blocks.map((block, i) => (
                    <div key={block.title} style={{
                        background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)',
                        borderLeft: '3px solid var(--n-success)', borderRadius: '8px', padding: '16px',
                    }}>
                        <h2 style={{
                            fontSize: '13px', fontWeight: 600, color: 'var(--n-text-primary)',
                            display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px',
                        }}>
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: '20px', height: '20px', borderRadius: '50%', fontSize: '11px', fontWeight: 700,
                                background: 'var(--n-success-bg)', color: 'var(--n-success)',
                                border: '1px solid var(--n-success-border)', flexShrink: 0,
                            }}>{i + 1}</span>
                            {block.title}
                        </h2>
                        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {block.items.map((item) => (
                                <li key={item} style={{
                                    display: 'flex', alignItems: 'flex-start', gap: '8px',
                                    fontSize: '13px', color: 'var(--n-text-secondary)', lineHeight: 1.5,
                                }}>
                                    <span style={{
                                        marginTop: '5px', flexShrink: 0,
                                        width: '5px', height: '5px', borderRadius: '50%',
                                        background: 'var(--n-success)', display: 'inline-block',
                                    }} />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}

                {/* Next step */}
                <div style={{
                    background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)',
                    borderRadius: '8px', padding: '16px',
                }}>
                    <h2 style={{
                        fontSize: '13px', fontWeight: 600, color: 'var(--n-text-primary)',
                        display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px',
                    }}>
                        <Shield size={14} style={{ color: 'var(--n-accent)' }} />
                        Prochaine étape
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--n-text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
                        Appliquez les correctifs dans votre code, puis vérifiez dans le lab. Enchaînez ensuite sur la Sandbox Defense.
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        <Link href="/student/defense"
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                padding: '7px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
                                background: 'var(--n-accent)', color: '#fff', textDecoration: 'none', transition: 'opacity 0.1s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                            Aller à Sandbox Defense
                        </Link>
                        <Link href={`${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}`}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                padding: '7px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
                                background: 'var(--n-bg-primary)', border: '1px solid var(--n-border)',
                                color: 'var(--n-text-secondary)', textDecoration: 'none',
                            }}>
                            Retour au challenge
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
