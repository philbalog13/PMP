import { query } from '../config/database';
import { logger } from '../utils/logger';

export type LearnerProfile = 'NOVICE' | 'INTERMEDIATE' | 'ADVANCED';

export interface DebriefDraft {
    rootCause: string;
    impactSummary: string;
    mitigationPriorities: string[];
    evidenceSummary: string;
    technicalScore?: number;
    communicationScore?: number;
    patchScore?: number;
}

export interface MultiAxisScoreInput {
    basePoints: number;
    estimatedMinutes: number;
    startedAt?: string | Date | null;
    submittedAt?: string | Date | null;
    hintsUsed: number;
    hintCost: number;
    incorrectAttempts: number;
    mode: 'GUIDED' | 'FREE';
    isFirstBlood: boolean;
    debrief?: DebriefDraft | null;
}

export interface MultiAxisScoreResult {
    timeScore: number;
    proofScore: number;
    patchScore: number;
    axisTotalScore: number;
    suggestedPoints: number;
    debriefCompleteness: number;
    elapsedMinutes: number;
    scoringVersion: string;
}

export interface FeedbackContext {
    submittedFlag: string;
    isCorrect: boolean;
    hintsUsed: number;
    incorrectAttempts: number;
    elapsedMinutes: number;
    estimatedMinutes: number;
    mode: 'GUIDED' | 'FREE';
    axisTotalScore: number;
    debriefCompleteness: number;
    rootCauseLength?: number;
    mitigationCount?: number;
    evidenceLength?: number;
}

export interface FeedbackPattern {
    code: string;
    severity: 'warning' | 'coaching' | 'positive';
    message: string;
}

export interface HintUnlockPolicyResult {
    allowed: boolean;
    minMinutes: number;
    minFailedAttempts: number;
    requiredPreviousHint: number | null;
    elapsedMinutes: number;
    failedAttempts: number;
    reasons: string[];
}

export interface AdaptiveGuidance {
    learnerProfile: LearnerProfile;
    focus: string;
    checklist: string[];
    successSignal: string;
}

function clampScore(value: number, min = 0, max = 100): number {
    if (!Number.isFinite(value)) {
        return min;
    }

    return Math.max(min, Math.min(max, Math.round(value)));
}

function parseTimestamp(value?: string | Date | null): Date | null {
    if (!value) {
        return null;
    }

    const parsed = value instanceof Date ? value : new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getElapsedMinutes(startedAt?: string | Date | null, endedAt?: string | Date | null): number {
    const start = parseTimestamp(startedAt);
    const end = parseTimestamp(endedAt || new Date());

    if (!start || !end) {
        return 0;
    }

    const diffMs = end.getTime() - start.getTime();
    if (!Number.isFinite(diffMs) || diffMs <= 0) {
        return 0;
    }

    return Math.max(1, Math.round(diffMs / 60000));
}

export function normalizeLearnerProfile(value: unknown, fallback: LearnerProfile = 'INTERMEDIATE'): LearnerProfile {
    const normalized = String(value || '').trim().toUpperCase();
    if (normalized === 'NOVICE' || normalized === 'INTERMEDIATE' || normalized === 'ADVANCED') {
        return normalized;
    }

    return fallback;
}

export function calculateDebriefCompleteness(debrief?: DebriefDraft | null): number {
    if (!debrief) {
        return 0;
    }

    const rootCauseLength = debrief.rootCause?.trim().length || 0;
    const impactLength = debrief.impactSummary?.trim().length || 0;
    const mitigationCount = Array.isArray(debrief.mitigationPriorities)
        ? debrief.mitigationPriorities.filter((item) => String(item || '').trim().length > 0).length
        : 0;
    const evidenceLength = debrief.evidenceSummary?.trim().length || 0;

    const rootCauseScore = Math.min(rootCauseLength / 2, 25);
    const impactScore = Math.min(impactLength / 2, 20);
    const mitigationScore = Math.min(mitigationCount * 8, 24);
    const evidenceScore = Math.min(evidenceLength / 2, 21);
    const selfScoreBoost = Number.isFinite(debrief.patchScore)
        ? Math.min(Math.max(Number(debrief.patchScore), 0), 100) * 0.1
        : 0;

    return clampScore(rootCauseScore + impactScore + mitigationScore + evidenceScore + selfScoreBoost, 0, 100);
}

export function calculateMultiAxisScore(input: MultiAxisScoreInput): MultiAxisScoreResult {
    const safeBasePoints = Math.max(10, Math.floor(input.basePoints || 10));
    const safeEstimatedMinutes = Math.max(10, Math.floor(input.estimatedMinutes || 10));
    const safeHintsUsed = Math.max(0, Math.floor(input.hintsUsed || 0));
    const safeHintCost = Math.max(0, Math.floor(input.hintCost || 0));
    const safeIncorrectAttempts = Math.max(0, Math.floor(input.incorrectAttempts || 0));

    const elapsedMinutesRaw = getElapsedMinutes(input.startedAt, input.submittedAt);
    const elapsedMinutes = elapsedMinutesRaw > 0
        ? elapsedMinutesRaw
        : Math.round(safeEstimatedMinutes * 1.7);
    const ratio = elapsedMinutes / safeEstimatedMinutes;

    let timeScoreRaw = 60;
    if (ratio <= 0.75) timeScoreRaw = 98;
    else if (ratio <= 1.0) timeScoreRaw = 92;
    else if (ratio <= 1.25) timeScoreRaw = 84;
    else if (ratio <= 1.75) timeScoreRaw = 74;
    else if (ratio <= 2.5) timeScoreRaw = 65;

    timeScoreRaw -= Math.min(safeHintsUsed * 3, 18);
    if (input.mode === 'FREE') {
        timeScoreRaw += 4;
    }
    const timeScore = clampScore(timeScoreRaw, 20, 100);

    const debriefCompleteness = calculateDebriefCompleteness(input.debrief);

    let proofScoreRaw = 82;
    if (input.mode === 'FREE') {
        proofScoreRaw += 8;
    }
    proofScoreRaw -= Math.min(safeHintsUsed, 5) * 10;
    proofScoreRaw -= Math.min(safeIncorrectAttempts, 8) * 4;
    proofScoreRaw += Math.round(debriefCompleteness * 0.1);

    if (Number.isFinite(input.debrief?.technicalScore)) {
        proofScoreRaw = (proofScoreRaw + Number(input.debrief?.technicalScore)) / 2;
    }
    if (Number.isFinite(input.debrief?.communicationScore)) {
        proofScoreRaw = (proofScoreRaw * 0.75) + (Number(input.debrief?.communicationScore) * 0.25);
    }

    const proofScore = clampScore(proofScoreRaw, 20, 100);

    let patchScoreRaw = input.debrief ? 48 + (debriefCompleteness * 0.5) : 42;
    if (Number.isFinite(input.debrief?.patchScore)) {
        patchScoreRaw = (patchScoreRaw + Number(input.debrief?.patchScore)) / 2;
    }
    const patchScore = clampScore(patchScoreRaw, 20, 100);

    const axisTotalScore = clampScore((timeScore * 0.35) + (proofScore * 0.35) + (patchScore * 0.3), 20, 100);

    const baseAxisPoints = Math.round((safeBasePoints * axisTotalScore) / 100);
    const hintPenalty = safeHintsUsed > 0 ? Math.round(safeHintCost * 0.7) : 0;
    const firstBloodBonus = input.isFirstBlood ? 50 : 0;
    const suggestedPoints = Math.max(10, baseAxisPoints - hintPenalty + firstBloodBonus);

    return {
        timeScore,
        proofScore,
        patchScore,
        axisTotalScore,
        suggestedPoints,
        debriefCompleteness,
        elapsedMinutes,
        scoringVersion: 'axis-v1',
    };
}

export function deriveFeedbackPatterns(context: FeedbackContext): FeedbackPattern[] {
    const patterns: FeedbackPattern[] = [];
    const normalizedFlag = String(context.submittedFlag || '');
    const trimmedFlag = normalizedFlag.trim();
    const matchesFlagFormat = /^PMP\{.+\}$/i.test(trimmedFlag);

    if (!matchesFlagFormat) {
        patterns.push({
            code: 'FLAG_FORMAT_INVALID',
            severity: 'warning',
            message: 'Format du flag invalide. Attendu: PMP{...} avec accolades completes.',
        });
    }

    if (normalizedFlag !== trimmedFlag) {
        patterns.push({
            code: 'FLAG_WHITESPACE_NOISE',
            severity: 'coaching',
            message: 'Des espaces parasites ont ete detectes. Utilisez un copier-coller propre.',
        });
    }

    if (!context.isCorrect && context.incorrectAttempts >= 5) {
        patterns.push({
            code: 'BRUTE_FORCE_PATTERN',
            severity: 'warning',
            message: 'Tentatives elevees detectees. Revenir a une hypothese technique avant un nouvel essai.',
        });
    }

    if (context.hintsUsed >= 3) {
        patterns.push({
            code: 'HINT_OVERUSE',
            severity: 'coaching',
            message: 'Beaucoup d indices utilises. Essayez de valider une etape par preuve avant le prochain hint.',
        });
    }

    if (context.elapsedMinutes > Math.round(context.estimatedMinutes * 1.8) && context.axisTotalScore < 65) {
        patterns.push({
            code: 'TIME_MANAGEMENT_DRIFT',
            severity: 'warning',
            message: 'Le temps depasse largement la cible. Decoupez le probleme en micro-tests de 5 minutes.',
        });
    }

    if (context.mode === 'GUIDED' && context.hintsUsed >= 2 && context.axisTotalScore < 70) {
        patterns.push({
            code: 'GUIDED_DEPENDENCY',
            severity: 'coaching',
            message: 'Dependance forte au mode guide. Passez en mode libre pour valider une preuve autonome.',
        });
    }

    if (context.debriefCompleteness < 40 && context.isCorrect) {
        patterns.push({
            code: 'DEBRIEF_INCOMPLETE',
            severity: 'warning',
            message: 'Debrief incomplet. Precisez cause racine, impact et mitigation priorisee.',
        });
    }

    if ((context.rootCauseLength || 0) > 0 && (context.rootCauseLength || 0) < 90) {
        patterns.push({
            code: 'ROOT_CAUSE_SHALLOW',
            severity: 'coaching',
            message: 'Cause racine trop courte. Ajoutez le mecanisme technique exact qui a permis l exploitation.',
        });
    }

    if ((context.mitigationCount || 0) > 0 && (context.mitigationCount || 0) < 2) {
        patterns.push({
            code: 'MITIGATION_NOT_PRIORITIZED',
            severity: 'coaching',
            message: 'Mitigation insuffisante. Definir au moins 2 actions priorisees (court terme et durable).',
        });
    }

    if ((context.evidenceLength || 0) > 0 && (context.evidenceLength || 0) < 120) {
        patterns.push({
            code: 'EVIDENCE_THIN',
            severity: 'coaching',
            message: 'Preuves trop legeres. Ajoutez commandes, sorties et verification avant/apres patch.',
        });
    }

    if (context.isCorrect && context.elapsedMinutes < Math.round(context.estimatedMinutes * 0.6) && context.axisTotalScore < 70) {
        patterns.push({
            code: 'FAST_BUT_FRAGILE',
            severity: 'coaching',
            message: 'Resolution rapide mais fragile. Renforcez la qualite des preuves et du patch.',
        });
    }

    if (context.isCorrect && context.hintsUsed <= 1 && context.incorrectAttempts <= 2 && context.axisTotalScore >= 80) {
        patterns.push({
            code: 'METHODICAL_EXECUTION',
            severity: 'positive',
            message: 'Bonne execution methodique: hypotheses claires, peu d essais et preuves solides.',
        });
    }

    return patterns.slice(0, 4);
}

const HINT_POLICY: Record<number, { minMinutes: number; minFailedAttempts: number; requiredPreviousHint: number | null }> = {
    1: { minMinutes: 0, minFailedAttempts: 0, requiredPreviousHint: null },
    2: { minMinutes: 6, minFailedAttempts: 2, requiredPreviousHint: 1 },
    3: { minMinutes: 12, minFailedAttempts: 4, requiredPreviousHint: 2 },
};

export function evaluateHintUnlockPolicy(params: {
    hintNumber: number;
    hintsUnlocked: number[];
    failedAttempts: number;
    startedAt?: string | Date | null;
    now?: Date;
}): HintUnlockPolicyResult {
    const hintNumber = Math.max(1, Math.floor(params.hintNumber || 1));
    const policy = HINT_POLICY[hintNumber] || {
        minMinutes: Math.max(0, (hintNumber - 1) * 6),
        minFailedAttempts: Math.max(0, (hintNumber - 1) * 2),
        requiredPreviousHint: hintNumber > 1 ? hintNumber - 1 : null,
    };

    const elapsedMinutes = getElapsedMinutes(params.startedAt, params.now || new Date());
    const failedAttempts = Math.max(0, Math.floor(params.failedAttempts || 0));
    const unlockedSet = new Set((params.hintsUnlocked || []).map((item) => Math.floor(item)));

    const reasons: string[] = [];
    if (policy.requiredPreviousHint !== null && !unlockedSet.has(policy.requiredPreviousHint)) {
        reasons.push(`Debloquez d abord l indice ${policy.requiredPreviousHint}.`);
    }

    const thresholdSatisfied = elapsedMinutes >= policy.minMinutes || failedAttempts >= policy.minFailedAttempts;
    if (!thresholdSatisfied) {
        reasons.push(
            `Indice verrouille: attendre ${policy.minMinutes} min depuis le debut ou atteindre ${policy.minFailedAttempts} essais rates.`
        );
    }

    return {
        allowed: reasons.length === 0,
        minMinutes: policy.minMinutes,
        minFailedAttempts: policy.minFailedAttempts,
        requiredPreviousHint: policy.requiredPreviousHint,
        elapsedMinutes,
        failedAttempts,
        reasons,
    };
}

export async function recordCtfLearningEvent(params: {
    studentId?: string | null;
    challengeId?: string | null;
    eventName: string;
    eventSource?: string;
    payload?: Record<string, unknown>;
}): Promise<void> {
    try {
        await query(
            `INSERT INTO learning.ctf_learning_events
                (student_id, challenge_id, event_name, event_source, event_payload)
             VALUES ($1, $2, $3, $4, $5::jsonb)`,
            [
                params.studentId || null,
                params.challengeId || null,
                params.eventName,
                params.eventSource || 'api',
                JSON.stringify(params.payload || {}),
            ]
        );
    } catch (error: any) {
        logger.warn('CTF learning event write failed', {
            eventName: params.eventName,
            error: error.message,
        });
    }
}

export function buildAdaptiveGuidance(step: {
    stepTitle: string;
    stepType: string;
    commandTemplate?: string | null;
}, learnerProfile: LearnerProfile): AdaptiveGuidance {
    if (learnerProfile === 'NOVICE') {
        return {
            learnerProfile,
            focus: `Appliquer ${step.stepTitle} pas a pas avec validation de chaque sortie.`,
            checklist: [
                'Verifier la cible et la commande avant execution.',
                'Executer puis capturer une sortie exploitable.',
                'Comparer la sortie obtenue au signal attendu.',
            ],
            successSignal: 'Sortie reproductible + explication claire du resultat observe.',
        };
    }

    if (learnerProfile === 'ADVANCED') {
        return {
            learnerProfile,
            focus: `Prioriser le test minimal pour ${step.stepType.toLowerCase()} puis escalader si necessaire.`,
            checklist: [
                'Formuler une hypothese testable.',
                'Executer le test minimal avec metriques utiles.',
                'Valider impact et contremesure sans bruit.',
            ],
            successSignal: 'Preuve concise, impact chiffre, patch defendable.',
        };
    }

    return {
        learnerProfile,
        focus: `Transformer ${step.stepTitle} en sequence test -> preuve -> decision.`,
        checklist: [
            'Executer le test en gardant un journal de commande.',
            'Isoler la condition qui valide la faille.',
            'Documenter la mitigation la plus rentable.',
        ],
        successSignal: 'Hypothese confirmee puis mitigation priorisee.',
    };
}
