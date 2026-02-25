'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, BookOpen, CheckCircle2, Shield } from 'lucide-react';
import { useAuth } from '../../../../auth/useAuth';
import { CourseCard, CoursePageShell, CoursePill } from '@/components/course/CoursePageShell';
import { APP_URLS } from '@shared/lib/app-urls';
import { normalizeCtfCode } from '@/lib/ctf-code-map';

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
    HSM_ATTACK: 'HSM',
    REPLAY_ATTACK: 'Replay',
    '3DS_BYPASS': '3DS',
    FRAUD_CNP: 'Fraude CNP',
    ISO8583_MANIPULATION: 'ISO 8583',
    PIN_CRACKING: 'PIN',
    MITM: 'MITM',
    PRIVILEGE_ESCALATION: 'Privesc',
    CRYPTO_WEAKNESS: 'Crypto',
};

function remediationBlocks(category: string): Array<{ title: string; items: string[] }> {
    const key = String(category || '').trim().toUpperCase();

    if (key === 'REPLAY_ATTACK') {
        return [
            { title: 'Correctifs serveur', items: ['Idempotency key obligatoire sur chaque requête', 'Nonce + fenêtre temporelle (TTL 60s)', 'Déduplication côté backend avec cache Redis', 'Vérifier STAN/RRN unique avant traitement'] },
            { title: 'Observabilité', items: ['Tracer STAN/RRN/nonce dans les logs structurés', 'Alerting sur taux de doublons > 1%', 'Métriques taux de rejouage par terminal/IP'] },
            { title: 'Validation', items: ['Tests e2e de rejeu avec même nonce', 'Tests de concurrence multi-thread', 'Rejeu sur plusieurs nœuds du cluster'] },
        ];
    }

    if (key === 'HSM_ATTACK') {
        return [
            { title: 'Isolation réseau', items: ['Réseau privé (VLAN dédié) uniquement', 'Allowlist IP stricte sur le HSM', 'mTLS obligatoire entre services et HSM', 'Firewall layer 7 avec inspection des commandes'] },
            { title: 'Autorisation & Audit', items: ['RBAC granulaire sur chaque commande HSM', 'Séparation des environnements (prod ≠ test)', 'Journalisation complète de tous les appels HSM', 'Rotation planifiée des clés exposées'] },
            { title: 'Validation', items: ['Tests d\'accès non autorisé aux endpoints', 'Revue des endpoints admin/debug', 'Vérification que les clés ne sont pas exposées en clair'] },
        ];
    }

    if (key === 'ISO8583_MANIPULATION') {
        return [
            { title: 'Validation des messages', items: ['Schéma strict : valider chaque DE selon le MTI', 'Vérification des champs critiques (DE39, DE49, DE4)', 'Rejet des incohérences bitmap/DE', 'Contrôle de longueur LLVAR/LLLVAR'] },
            { title: 'Protection d\'intégrité', items: ['MAC obligatoire (DE64/DE128) sur tous les messages', 'Contrôle de rejeu (STAN unique + timestamp)', 'Rate limit par terminal/acquéreur', 'Validation croisée montant/devise/merchant'] },
            { title: 'Tests', items: ['Fuzzing des champs ISO 8583', 'Cas limites : longueur max, caractères spéciaux', 'Tests de rejet de messages malformés'] },
        ];
    }

    if (key === '3DS_BYPASS') {
        return [
            { title: 'Correctifs protocolaires', items: ['Forcer 3DS sur toutes les transactions > seuil SCA', 'Valider le cavv/eci serveur-side (pas côté client)', 'Rejeter les ECI 07 (3DS non disponible) au-dessus du seuil', 'Vérifier la cohérence transaction ID entre AReq et ARes'] },
            { title: 'Surveillance', items: ['Alerter sur taux d\'ECI 07 anormal par commerçant', 'Monitorer les downgrades 3DS2 → 3DS1', 'Tracer les échecs d\'authentification par BIN range'] },
            { title: 'Validation', items: ['Tests de contournement 3DS avec ECI modifié', 'Tests de replay du cavv', 'Vérification de la chaîne de confiance DS → ACS'] },
        ];
    }

    if (key === 'FRAUD_CNP') {
        return [
            { title: 'Détection', items: ['Moteur de scoring temps réel (vélocité, device, géo)', 'Device fingerprinting côté client', 'Vérification d\'adresse (AVS) et CVV obligatoire', 'Analyse du comportement de navigation (session duration, mouse patterns)'] },
            { title: 'Prévention', items: ['3-D Secure 2.x avec challenge adaptatif', 'Limites de vélocité par carte/IP/device', 'Blocklist d\'emails jetables et de BIN à risque', 'Machine learning : détection d\'anomalies en temps réel'] },
            { title: 'Réponse', items: ['Workflow de review pour scores intermédiaires', 'Chargeback représentation avec preuves', 'Partage de renseignements fraude (schemes, consortiums)'] },
        ];
    }

    if (key === 'PIN_CRACKING') {
        return [
            { title: 'Protection du PIN', items: ['PIN block ISO 9564 format 4 (AES)', 'DUKPT pour dérivation unique par transaction', 'Chiffrement point-to-point (P2PE) dès le terminal', 'Zéroïsation immédiate après vérification'] },
            { title: 'Contrôle d\'accès', items: ['Limitation à 3 tentatives de PIN', 'Verrouillage de la carte après échecs consécutifs', 'RBAC strict sur les fonctions HSM de vérification PIN', 'Audit trail de chaque vérification PIN'] },
            { title: 'Tests', items: ['Test de brute force sur l\'API de vérification', 'Vérification que le PIN n\'apparaît pas dans les logs', 'Test de timing attack sur la réponse PIN OK/KO'] },
        ];
    }

    if (key === 'MITM') {
        return [
            { title: 'Chiffrement transport', items: ['TLS 1.3 obligatoire sur tous les flux', 'Certificate pinning côté client (mobile/terminal)', 'mTLS pour les communications inter-services', 'HSTS avec preload pour les interfaces web'] },
            { title: 'Intégrité des messages', items: ['MAC/HMAC sur les messages applicatifs', 'Vérification d\'intégrité end-to-end', 'Protection contre le downgrade de protocole', 'Signature des réponses serveur'] },
            { title: 'Détection', items: ['Monitoring des certificats (CT logs)', 'Alerting sur changement de certificat inattendu', 'Test d\'interception avec proxy MITM'] },
        ];
    }

    if (key === 'PRIVILEGE_ESCALATION') {
        return [
            { title: 'Contrôle d\'accès', items: ['RBAC strict avec principe du moindre privilège', 'Validation des rôles côté serveur (jamais côté client)', 'Vérification d\'ownership sur chaque ressource', 'JWT avec claims minimaux et validation stricte'] },
            { title: 'Protection', items: ['Rate limiting sur les endpoints admin', 'Séparation des API admin et utilisateur', 'Input validation et output encoding', 'Gestion d\'erreurs non bavarde (pas de stack traces)'] },
            { title: 'Audit', items: ['Journalisation de chaque action admin', 'Alerting sur changement de rôle', 'Tests IDOR sur toutes les ressources', 'Revue périodique des droits d\'accès'] },
        ];
    }

    if (key === 'CRYPTO_WEAKNESS') {
        return [
            { title: 'Algorithmes', items: ['AES-256-GCM pour le chiffrement symétrique', 'RSA ≥ 2048 bits ou ECC P-256 pour l\'asymétrique', 'SHA-256 minimum pour le hashing', 'Abandon de DES, 3DES, MD5, SHA-1'] },
            { title: 'Gestion des clés', items: ['HSM pour le stockage des clés en production', 'Rotation planifiée des clés (annuelle minimum)', 'Séparation des clés par environnement', 'Key derivation robuste (PBKDF2, Argon2, scrypt)'] },
            { title: 'Validation', items: ['Tests avec vecteurs de test officiels (NIST, ANSI)', 'Vérification de l\'entropie des IV/nonces', 'Audit de code pour les usages crypto hardcodés'] },
        ];
    }

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
        if (!token) {
            setError('Session expiree. Merci de vous reconnecter.');
            setLoading(false);
            return;
        }

        try {
            setError(null);
            setLoading(true);

            const res = await fetch(`/api/ctf/challenges/${encodeURIComponent(normalizedCode)}?mode=FREE`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data?.success || !data?.challenge) {
                throw new Error(data?.error || 'Impossible de charger la remediation.');
            }

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
            <CoursePageShell
                title="Chargement..."
                description="Recuperation des informations de remediation."
                icon={<Shield className="h-8 w-8 text-emerald-300" />}
                crumbs={[
                    { label: 'Mon Parcours', href: '/student' },
                    { label: 'Security Labs', href: APP_URLS.studentCtf },
                    { label: normalizedCode || 'Remediation' },
                    { label: 'Remediation' },
                ]}
                backHref={`${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}`}
                backLabel="Retour au challenge"
            >
                <CourseCard className="p-8">
                    <div className="flex items-center gap-3 text-slate-300">
                        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-sm">Chargement...</span>
                    </div>
                </CourseCard>
            </CoursePageShell>
        );
    }

    if (!challenge) {
        return (
            <CoursePageShell
                title="Remediation indisponible"
                description={error || 'La remediation est indisponible.'}
                icon={<AlertCircle className="h-8 w-8 text-red-200" />}
                crumbs={[
                    { label: 'Mon Parcours', href: '/student' },
                    { label: 'Security Labs', href: APP_URLS.studentCtf },
                    { label: normalizedCode || 'Remediation' },
                    { label: 'Erreur' },
                ]}
                backHref={APP_URLS.studentCtf}
                backLabel="Retour aux challenges"
            >
                <CourseCard className="border border-red-500/20 bg-red-500/5 p-6 md:p-8">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 text-red-300" />
                        <div className="min-w-0">
                            <h2 className="text-lg font-semibold text-white">Impossible de charger</h2>
                            <p className="mt-1 text-sm text-red-100/90">{error || 'Erreur inconnue.'}</p>
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                                <button
                                    onClick={() => void fetchChallenge()}
                                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold"
                                >
                                    Reessayer
                                </button>
                                <Link
                                    href={APP_URLS.studentCtf}
                                    className="px-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/40 text-sm font-semibold hover:bg-slate-900/60"
                                >
                                    Retour
                                </Link>
                            </div>
                        </div>
                    </div>
                </CourseCard>
            </CoursePageShell>
        );
    }

    const categoryLabel = CATEGORY_LABELS[challenge.category] || challenge.category;
    const blocks = remediationBlocks(challenge.category);
    const completed = challenge.status === 'COMPLETED';

    return (
        <CoursePageShell
            title="Remediation"
            description={challenge.title}
            icon={<Shield className="h-8 w-8 text-emerald-300" />}
            crumbs={[
                { label: 'Mon Parcours', href: '/student' },
                { label: 'Security Labs', href: APP_URLS.studentCtf },
                { label: normalizedCode || 'Challenge', href: `${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}` },
                { label: 'Remediation' },
            ]}
            backHref={`${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}`}
            backLabel="Retour au challenge"
            meta={
                <>
                    <CoursePill tone="slate">{challenge.code}</CoursePill>
                    <CoursePill tone="slate">{categoryLabel}</CoursePill>
                    <CoursePill tone="slate">{challenge.difficulty}</CoursePill>
                    <CoursePill tone={completed ? 'emerald' : 'amber'}>
                        {completed ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                        {completed ? 'Resolu' : 'Non resolu'}
                    </CoursePill>
                </>
            }
            actions={
                <Link
                    href={APP_URLS.studentCtf}
                    className="px-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/40 hover:bg-slate-900/60 text-sm font-semibold inline-flex items-center gap-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Dashboard CTF
                </Link>
            }
        >
            <div className="space-y-6">
                {!completed && (
                    <CourseCard className="border border-amber-500/20 bg-amber-500/5 p-6 md:p-8">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="mt-0.5 h-5 w-5 text-amber-300" />
                            <div>
                                <h2 className="text-lg font-bold text-white">Remediation disponible apres resolution</h2>
                                <p className="mt-2 text-sm text-slate-300">
                                    Terminez le challenge, puis revenez ici pour valider les correctifs.
                                </p>
                            </div>
                        </div>
                    </CourseCard>
                )}

                <CourseCard className="p-6 md:p-8">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-cyan-300" />
                        Resume
                    </h2>
                    <div className="mt-4 grid gap-3">
                        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                            <p className="text-xs text-slate-500 uppercase tracking-wider">Vulnerabilite</p>
                            <p className="mt-1 text-sm text-slate-200">{challenge.vulnerabilityType}</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                            <p className="text-xs text-slate-500 uppercase tracking-wider">Vecteur</p>
                            <p className="mt-1 text-sm text-slate-200">{challenge.attackVector}</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
                            <p className="text-xs text-slate-500 uppercase tracking-wider">Cible</p>
                            <p className="mt-1 text-xs font-mono text-slate-200 whitespace-pre-wrap">{challenge.targetEndpoint}</p>
                            <p className="mt-2 text-xs text-slate-500">Service: {challenge.targetService}</p>
                        </div>
                    </div>
                </CourseCard>

                {blocks.map((block) => (
                    <CourseCard key={block.title} className="p-6 md:p-8">
                        <h2 className="text-lg font-bold text-white">{block.title}</h2>
                        <ul className="mt-4 space-y-2 text-sm text-slate-300">
                            {block.items.map((item) => (
                                <li key={item} className="flex items-start gap-2">
                                    <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </CourseCard>
                ))}

                <CourseCard className="p-6 md:p-8">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Shield className="h-5 w-5 text-emerald-300" />
                        Prochaine etape
                    </h2>
                    <p className="mt-2 text-sm text-slate-300">
                        Appliquez les correctifs dans votre code, puis verifiez dans le lab. Vous pouvez ensuite enchainer
                        sur la Sandbox Defense.
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Link
                            href="/student/defense"
                            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold"
                        >
                            Aller a Sandbox Defense
                        </Link>
                        <Link
                            href={`${APP_URLS.studentCtf}/${encodeURIComponent(normalizedCode)}`}
                            className="px-4 py-2.5 rounded-xl border border-white/10 bg-slate-900/40 hover:bg-slate-900/60 text-sm font-semibold"
                        >
                            Retour au challenge
                        </Link>
                    </div>
                </CourseCard>
            </div>
        </CoursePageShell>
    );
}

