import { Request, Response } from 'express';
import { query } from '../config/database';
import {
    awardCtfBadges,
    calculatePoints,
    unlockNextChallenges,
    validateFlag,
} from '../services/ctfEvaluation.service';
import {
    CTF_CHALLENGE_BY_CODE,
    CTF_CHALLENGES,
    CTF_TOTAL_ACTIVE_CHALLENGES,
    CtfChallengeSeed,
} from '../data/ctfChallenges';
import {
    DebriefDraft,
    buildAdaptiveGuidance,
    calculateDebriefCompleteness,
    calculateMultiAxisScore,
    deriveFeedbackPatterns,
    evaluateHintUnlockPolicy,
    normalizeLearnerProfile,
    recordCtfLearningEvent,
} from '../services/ctfLearning.service';
import { initStudentVulnForChallenge, resetStudentVuln } from '../services/ctfVuln.service';
import { stopMitmBackgroundTraffic } from '../services/ctfTraffic.service';
import {
    cleanupExpiredLabSessions,
    CtfLabServiceError,
    extendLabSession,
    getLabSessionForChallenge,
    resetLabSession,
    resolveLabProxyTarget,
    startOrReuseLabSession,
    terminateLabSession,
} from '../services/ctfLab.service';
import { logger } from '../utils/logger';

type CtfMode = 'GUIDED' | 'FREE';
type LearnerProfile = 'NOVICE' | 'INTERMEDIATE' | 'ADVANCED';
type CtfWorkflowMode = 'FLAG_ONLY' | 'TASK_VALIDATION';

type CtfStatus = 'LOCKED' | 'UNLOCKED' | 'IN_PROGRESS' | 'COMPLETED';

interface GuidedStepValidationResult {
    isCorrect: boolean;
    message: string;
}

let seedInitialized = false;
let seedInFlight: Promise<void> | null = null;
const ACTIVE_ROOM_CODES = CTF_CHALLENGES.map((challenge) => challenge.code.toUpperCase());
const ACTIVE_ROOM_CODE_SET = new Set(ACTIVE_ROOM_CODES);

function normalizeChallengeCode(value: unknown): string {
    return String(value || '').trim().toUpperCase();
}

function resolveChallengeCode(value: unknown): string {
    return normalizeChallengeCode(value);
}

function getStudentId(req: Request): string | null {
    return (req as any).user?.userId || null;
}

function parseMode(value: unknown): CtfMode {
    return String(value || 'GUIDED').toUpperCase() === 'FREE' ? 'FREE' : 'GUIDED';
}

function parseLearnerProfile(value: unknown, fallback: LearnerProfile = 'INTERMEDIATE'): LearnerProfile {
    return normalizeLearnerProfile(value, fallback);
}

function getChallengeWorkflowMode(challengeCode: string): CtfWorkflowMode {
    const seed = CTF_CHALLENGE_BY_CODE.get(challengeCode);
    return seed?.workflowMode === 'TASK_VALIDATION' ? 'TASK_VALIDATION' : 'FLAG_ONLY';
}

function getInternalProxySecret(): string {
    return process.env.LAB_INTERNAL_PROXY_SECRET || process.env.INTERNAL_HSM_SECRET || '';
}

function handleLabError(res: Response, error: any, fallbackMessage: string) {
    if (error instanceof CtfLabServiceError) {
        return res.status(error.statusCode).json({
            success: false,
            error: error.message,
            code: error.code,
        });
    }

    logger.error(fallbackMessage, { error: error?.message || String(error) });
    return res.status(500).json({ success: false, error: fallbackMessage });
}

function parseJsonObject(value: unknown): Record<string, any> {
    if (!value) {
        return {};
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
        return value as Record<string, any>;
    }

    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed as Record<string, any>;
            }
        } catch {
            return {};
        }
    }

    return {};
}

function parseJsonArray(value: unknown): any[] {
    if (!value) {
        return [];
    }

    if (Array.isArray(value)) {
        return value;
    }

    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    return [];
}

function parsePriorityList(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.map((entry) => String(entry || '').trim()).filter(Boolean).slice(0, 10);
    }

    if (typeof value === 'string') {
        return value
            .split('\n')
            .map((entry) => entry.trim())
            .filter(Boolean)
            .slice(0, 10);
    }

    return [];
}

function buildDebriefDraft(payload: any): DebriefDraft | null {
    if (!payload || typeof payload !== 'object') {
        return null;
    }

    const rootCause = String(payload.rootCause || '').trim();
    const impactSummary = String(payload.impactSummary || '').trim();
    const evidenceSummary = String(payload.evidenceSummary || '').trim();
    const mitigationPriorities = parsePriorityList(payload.mitigationPriorities);

    if (!rootCause && !impactSummary && !evidenceSummary && mitigationPriorities.length === 0) {
        return null;
    }

    return {
        rootCause,
        impactSummary,
        mitigationPriorities,
        evidenceSummary,
        technicalScore: Number(payload.technicalScore || 0),
        communicationScore: Number(payload.communicationScore || 0),
        patchScore: Number(payload.patchScore || 0),
    };
}

function normalizeIntArray(value: unknown): number[] {
    if (Array.isArray(value)) {
        return value.map((entry) => Number(entry)).filter((entry) => Number.isInteger(entry) && entry > 0);
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed || trimmed === '{}') {
            return [];
        }

        return trimmed
            .replace('{', '')
            .replace('}', '')
            .split(',')
            .map((entry) => Number(entry.trim()))
            .filter((entry) => Number.isInteger(entry) && entry > 0);
    }

    return [];
}

function normalizeFreeTextAnswer(value: string): string {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function normalizeCompactAnswer(value: string): string {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function validatePay001StepAnswer(stepNumber: number, submittedAnswer: string): GuidedStepValidationResult {
    const raw = String(submittedAnswer || '').trim();
    const normalized = normalizeFreeTextAnswer(raw);
    const compact = normalizeCompactAnswer(raw);

    if (stepNumber === 1) {
        const isCorrect = /\b8080\b/.test(normalized)
            && /\btcp\b/.test(normalized)
            && /\bopen\b/.test(normalized)
            && /\bhttp\b/.test(normalized);
        return {
            isCorrect,
            message: isCorrect
                ? 'Correct: port 8080/tcp open http identified.'
                : 'Expected service evidence like: 8080/tcp open http.',
        };
    }

    if (stepNumber === 2) {
        const expected = 'pmp{cleartext_pos_sniff_4c8f3}';
        const isCorrect = normalizeCompactAnswer(raw) === expected;
        return {
            isCorrect,
            message: isCorrect
                ? 'Correct user flag recovered from network traffic.'
                : 'Incorrect user flag. Re-check tcpdump transaction payloads.',
        };
    }

    if (stepNumber === 3) {
        const isCorrect = /uid=0\(root\)/.test(compact)
            && /gid=0\(root\)/.test(compact)
            && /groups=0\(root\)/.test(compact);
        return {
            isCorrect,
            message: isCorrect
                ? 'Correct: admin command execution runs as root.'
                : 'Expected id output showing uid=0(root) gid=0(root) groups=0(root).',
        };
    }

    if (stepNumber === 4) {
        const expected = 'pmp{rce_admin_panel_root_9a2b1}';
        const isCorrect = normalizeCompactAnswer(raw) === expected;
        return {
            isCorrect,
            message: isCorrect
                ? 'Correct root flag recovered.'
                : 'Incorrect root flag. Re-check /root/root.txt command output.',
        };
    }

    if (stepNumber === 5) {
        const hasCleartextIssue = /(cleartext|plaintext|non chiff|en clair)/.test(normalized)
            && /(transaction|trafic|traffic|reseau|network)/.test(normalized);
        const hasInterceptionImpact = /(intercept|sniff|capture)/.test(normalized)
            && /(sensible|sensitive|user flag|flag utilisateur|user\.txt)/.test(normalized);
        const hasAdminRce = /(admin|8080)/.test(normalized)
            && /(commande|command|injection|sans validation|without validation|unsanitized|non securise)/.test(normalized);
        const hasRootImpact = /(root|privilege|privileges|escalade|escalation)/.test(normalized)
            && /(root\.txt|flag root|lecture|lire|read)/.test(normalized);

        const isCorrect = hasCleartextIssue && hasInterceptionImpact && hasAdminRce && hasRootImpact;
        return {
            isCorrect,
            message: isCorrect
                ? 'Synthesis accepted.'
                : 'Mention cleartext transaction interception and admin command injection leading to root compromise.',
        };
    }

    return {
        isCorrect: false,
        message: 'Unsupported step for PAY-001 validator.',
    };
}

function normalizeDigits(value: string): string {
    return String(value || '').replace(/\D+/g, '');
}

function validatePci001StepAnswer(stepNumber: number, submittedAnswer: string): GuidedStepValidationResult {
    const raw = String(submittedAnswer || '').trim();
    const normalized = normalizeFreeTextAnswer(raw);
    const compact = normalizeCompactAnswer(raw);

    if (stepNumber === 1) {
        const isCorrect = normalized === '1' || compact === 'q' || /\b(parameter|param|get)\s*[:=]?\s*q\b/.test(normalized);
        return {
            isCorrect,
            message: isCorrect
                ? 'Correct search parameter identification.'
                : 'Expected one GET search parameter (commonly q).',
        };
    }

    if (stepNumber === 2) {
        const isCorrect = compact === 'ecommerce_db';
        return {
            isCorrect,
            message: isCorrect
                ? 'Correct database name found.'
                : 'Expected database name: ecommerce_db.',
        };
    }

    if (stepNumber === 3) {
        const isCorrect = compact === 'pmp{pci_dss_weak_sql_5f3a2}';
        return {
            isCorrect,
            message: isCorrect
                ? 'Correct user flag extracted.'
                : 'Incorrect user flag from cards table.',
        };
    }

    if (stepNumber === 4) {
        const isCorrect = compact === 'root' || /\broot\b/.test(normalized);
        return {
            isCorrect,
            message: isCorrect
                ? 'Correct UID 0 account identified.'
                : 'Expected UID 0 user: root.',
        };
    }

    if (stepNumber === 5) {
        const isCorrect = compact === 'cvv' || compact === 'cvv2' || /\bcvv2?\b/.test(normalized);
        return {
            isCorrect,
            message: isCorrect
                ? 'Correct PCI DSS violation identified.'
                : 'Expected forbidden column: cvv (or cvv2).',
        };
    }

    if (stepNumber === 6) {
        const isCorrect = compact === 'pmp{pci_dss_root_violation_8c4e7}';
        return {
            isCorrect,
            message: isCorrect
                ? 'Correct root flag recovered.'
                : 'Incorrect root flag value.',
        };
    }

    if (stepNumber === 7) {
        const hasSqli = /(sql injection|injection sql|sqli)/.test(normalized);
        const hasCvvStorage = /\bcvv2?\b/.test(normalized) && /(stock|stor|enregistre|persist)/.test(normalized);
        const hasWeakCredentials = /(mot de passe|password)/.test(normalized)
            && /(clair|clear|weak|faible|plain)/.test(normalized);
        const hasPciImpact = /(pci|compliance|conformite|non conform|dss)/.test(normalized);

        const matches = [hasSqli, hasCvvStorage, hasWeakCredentials, hasPciImpact].filter(Boolean).length;
        const isCorrect = matches >= 3;
        return {
            isCorrect,
            message: isCorrect
                ? 'PCI DSS synthesis accepted.'
                : 'Mention SQL injection, CVV storage, weak credential/data handling, and PCI impact.',
        };
    }

    return {
        isCorrect: false,
        message: 'Unsupported step for PCI-001 validator.',
    };
}

function validateSoc001StepAnswer(stepNumber: number, submittedAnswer: string): GuidedStepValidationResult {
    const raw = String(submittedAnswer || '').trim();
    const normalized = normalizeFreeTextAnswer(raw);
    const compact = normalizeCompactAnswer(raw);

    if (stepNumber === 1) {
        const isCorrect = compact === 'support@banque-securite.com';
        return {
            isCorrect,
            message: isCorrect
                ? 'Correct displayed sender identified.'
                : 'Expected sender: support@banque-securite.com.',
        };
    }

    if (stepNumber === 2) {
        const isCorrect = compact === 'phisher@malicious.net';
        return {
            isCorrect,
            message: isCorrect
                ? 'Correct Return-Path identified.'
                : 'Expected Return-Path: phisher@malicious.net.',
        };
    }

    if (stepNumber === 3) {
        const isCorrect = compact === 'http://192.168.1.105/fake-login';
        return {
            isCorrect,
            message: isCorrect
                ? 'Correct hidden URL identified.'
                : 'Expected URL: http://192.168.1.105/fake-login.',
        };
    }

    if (stepNumber === 4) {
        const digits = normalizeDigits(raw);
        const isCorrect = digits === '0123456789';
        return {
            isCorrect,
            message: isCorrect
                ? 'Correct spoofed phone number identified.'
                : 'Expected number: 01 23 45 67 89.',
        };
    }

    if (stepNumber === 5) {
        const hasAmount = /\b15000\b/.test(normalized) || /\b15 000\b/.test(raw);
        const normalizedIban = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const hasIban = normalizedIban.includes('FR7612345678901234567890123');
        const isCorrect = hasAmount && hasIban;
        return {
            isCorrect,
            message: isCorrect
                ? 'Correct fraudulent transfer details identified.'
                : 'Provide both amount (15000) and IBAN FR76 1234 5678 9012 3456 7890 123.',
        };
    }

    if (stepNumber === 6) {
        const hasLinkCare = /(ne pas cliquer|do not click|url|lien)/.test(normalized);
        const hasCallback = /(verifier|verification|telephone|call[- ]?back|rappel)/.test(normalized);
        const hasHeaderCheck = /(header|en[- ]?tete|from|return[- ]?path|expediteur|sender)/.test(normalized);
        const hasNoCodeShare = /(code|otp|identifiant|credential|mot de passe|password)/.test(normalized)
            && /(ne pas communiquer|never share|ne jamais partager|do not share)/.test(normalized);

        const matches = [hasLinkCare, hasCallback, hasHeaderCheck, hasNoCodeShare].filter(Boolean).length;
        const isCorrect = matches >= 3;
        return {
            isCorrect,
            message: isCorrect
                ? 'Prevention synthesis accepted.'
                : 'Provide at least three controls: link caution, independent verification, sender/header checks, no code sharing.',
        };
    }

    return {
        isCorrect: false,
        message: 'Unsupported step for SOC-001 validator.',
    };
}

function validateApi001StepAnswer(stepNumber: number, submittedAnswer: string): GuidedStepValidationResult {
    const raw = String(submittedAnswer || '').trim();
    const normalized = normalizeFreeTextAnswer(raw);
    const compact = normalizeCompactAnswer(raw);

    if (stepNumber === 1) {
        const match = raw.match(/\d+/);
        const count = match ? Number(match[0]) : NaN;
        const isCorrect = Number.isFinite(count) && count === 5;
        return {
            isCorrect,
            message: isCorrect
                ? 'Correct endpoint count identified.'
                : 'Expected endpoint count: 5.',
        };
    }

    if (stepNumber === 2) {
        const tokenCandidate = raw.replace(/^bearer\s+/i, '').trim();
        const jwtLike = /^eyJ[A-Za-z0-9\-_]*\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(tokenCandidate);
        const isCorrect = jwtLike || /^eyJ[A-Za-z0-9\-_]{10,}$/.test(tokenCandidate);
        return {
            isCorrect,
            message: isCorrect
                ? 'Token format accepted.'
                : 'Expected a JWT-like token beginning with eyJ...',
        };
    }

    if (stepNumber === 3) {
        const isCorrect = compact === 'pmp{api_bola_vulnerability_7d8e2}';
        return {
            isCorrect,
            message: isCorrect
                ? 'Correct BOLA user flag recovered.'
                : 'Incorrect BOLA user flag value.',
        };
    }

    if (stepNumber === 4) {
        const isCorrect = /\b(oui|yes|success|true)\b/.test(normalized) || /status["'=:\s]+success/.test(compact);
        return {
            isCorrect,
            message: isCorrect
                ? 'Transfer bypass confirmation accepted.'
                : 'Expected success confirmation (yes/oui/status success).',
        };
    }

    if (stepNumber === 5) {
        const isCorrect = compact === 'pmp{api_admin_exposure_9f1b4}';
        return {
            isCorrect,
            message: isCorrect
                ? 'Correct admin/root flag recovered.'
                : 'Incorrect admin/root flag value.',
        };
    }

    if (stepNumber === 6) {
        const hasBola = /\bbola\b|object level authorization|broken object/.test(normalized);
        const hasRateBypass = /(rate limit|limite|limit).*(bypass|contourn|evit)/.test(normalized)
            || /(bypass|contourn).*(rate limit|limite|limit)/.test(normalized);
        const hasAccessControl = /(access control|controle d acces|admin|authorization|autorisation)/.test(normalized);

        const isCorrect = hasBola && hasRateBypass && hasAccessControl;
        return {
            isCorrect,
            message: isCorrect
                ? 'API vulnerability synthesis accepted.'
                : 'Mention BOLA, transfer/rate-limit bypass, and insufficient admin access control.',
        };
    }

    return {
        isCorrect: false,
        message: 'Unsupported step for API-001 validator.',
    };
}

function validateDora001StepAnswer(stepNumber: number, submittedAnswer: string): GuidedStepValidationResult {
    const raw = String(submittedAnswer || '').trim();
    const normalized = normalizeFreeTextAnswer(raw);
    const compact = normalizeCompactAnswer(raw);

    if (stepNumber === 1) {
        const isCorrect = compact === 'readme_ransom.txt';
        return {
            isCorrect,
            message: isCorrect
                ? 'Correct ransom note identified.'
                : 'Expected ransomware note: README_RANSOM.txt.',
        };
    }

    if (stepNumber === 2) {
        const isCorrect = /\b192\.168\.1\.100\b/.test(raw);
        return {
            isCorrect,
            message: isCorrect
                ? 'Correct initial attacker IP identified.'
                : 'Expected source IP: 192.168.1.100.',
        };
    }

    if (stepNumber === 3) {
        const isCorrect = compact === 'appuser' || /\bappuser\b/.test(normalized);
        return {
            isCorrect,
            message: isCorrect
                ? 'Correct lateral movement user identified.'
                : 'Expected user: appuser.',
        };
    }

    if (stepNumber === 4) {
        const hasIptables = /\biptables\b/.test(normalized);
        const hasDrop = /\bdrop\b/.test(normalized);
        const hasDirection = /\boutput\b|\bforward\b/.test(normalized);
        const hasSrcDst = /\-s\b/.test(raw) && /\-d\b/.test(raw);
        const isCorrect = hasIptables && hasDrop && hasDirection && hasSrcDst;
        return {
            isCorrect,
            message: isCorrect
                ? 'Containment rule accepted.'
                : 'Provide an iptables DROP rule with source and destination.',
        };
    }

    if (stepNumber === 5) {
        const isCorrect = /\b2026-02-20\b/.test(raw);
        return {
            isCorrect,
            message: isCorrect
                ? 'Correct backup date identified.'
                : 'Expected clean backup date: 2026-02-20.',
        };
    }

    if (stepNumber === 6) {
        const isCorrect = compact === 'pmp{dora_recovery_success_3e6d9}';
        return {
            isCorrect,
            message: isCorrect
                ? 'Correct recovery flag recovered.'
                : 'Incorrect recovery flag value.',
        };
    }

    if (stepNumber === 7) {
        const match = raw.match(/\d{3}/);
        const status = match ? Number(match[0]) : NaN;
        const isCorrect = Number.isFinite(status) && status === 200;
        return {
            isCorrect,
            message: isCorrect
                ? 'Service continuity check passed.'
                : 'Expected API health HTTP status: 200.',
        };
    }

    if (stepNumber === 8) {
        const hasTimeline = /(timeline|chronologie|sequence|when)/.test(normalized);
        const hasImpact = /(impact|service|donnees|data|business)/.test(normalized);
        const hasActions = /(isolation|restauration|restore|containment|corrective|actions)/.test(normalized);
        const hasRecommendations = /(recommendation|prevention|avoid|amelioration|hardening|resilience)/.test(normalized);

        const isCorrect = hasTimeline && hasImpact && hasActions && hasRecommendations;
        return {
            isCorrect,
            message: isCorrect
                ? 'DORA report synthesis accepted.'
                : 'Include timeline, impact, corrective actions, and recommendations.',
        };
    }

    return {
        isCorrect: false,
        message: 'Unsupported step for DORA-001 validator.',
    };
}

function validateGuidedStepAnswer(
    challengeCode: string,
    stepNumber: number,
    submittedAnswer: string
): GuidedStepValidationResult {
    if (challengeCode === 'PAY-001') return validatePay001StepAnswer(stepNumber, submittedAnswer);
    if (challengeCode === 'PCI-001') return validatePci001StepAnswer(stepNumber, submittedAnswer);
    if (challengeCode === 'SOC-001') return validateSoc001StepAnswer(stepNumber, submittedAnswer);
    if (challengeCode === 'API-001') return validateApi001StepAnswer(stepNumber, submittedAnswer);
    if (challengeCode === 'DORA-001') return validateDora001StepAnswer(stepNumber, submittedAnswer);

    return {
        isCorrect: false,
        message: `No step validator configured for ${challengeCode}.`,
    };
}

async function isPrerequisiteCompleted(studentId: string, prerequisiteCode: string | null): Promise<boolean> {
    if (!prerequisiteCode) {
        return true;
    }

    const result = await query(
        `SELECT EXISTS (
            SELECT 1
            FROM learning.ctf_submissions s
            JOIN learning.ctf_challenges c ON c.id = s.challenge_id
            WHERE s.student_id = $1
              AND s.is_correct = true
              AND c.challenge_code = $2
        ) AS prerequisite_met`,
        [studentId, prerequisiteCode]
    );

    return Boolean(result.rows[0]?.prerequisite_met);
}

async function upsertChallengeSeed(challenge: CtfChallengeSeed): Promise<void> {
    const challengeResult = await query(
        `INSERT INTO learning.ctf_challenges (
            challenge_code,
            title,
            description,
            category,
            difficulty,
            points,
            flag_value,
            prerequisite_challenge_code,
            target_service,
            target_endpoint,
            vulnerability_type,
            attack_vector,
            learning_objectives,
            estimated_minutes,
            mission_brief,
            incident_artifacts,
            proof_rubric,
            is_active
        )
        VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13::jsonb, $14, $15::jsonb, $16::jsonb, $17::jsonb, $18
        )
        ON CONFLICT (challenge_code)
        DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            category = EXCLUDED.category,
            difficulty = EXCLUDED.difficulty,
            points = EXCLUDED.points,
            flag_value = EXCLUDED.flag_value,
            prerequisite_challenge_code = EXCLUDED.prerequisite_challenge_code,
            target_service = EXCLUDED.target_service,
            target_endpoint = EXCLUDED.target_endpoint,
            vulnerability_type = EXCLUDED.vulnerability_type,
            attack_vector = EXCLUDED.attack_vector,
            learning_objectives = EXCLUDED.learning_objectives,
            estimated_minutes = EXCLUDED.estimated_minutes,
            mission_brief = EXCLUDED.mission_brief,
            incident_artifacts = EXCLUDED.incident_artifacts,
            proof_rubric = EXCLUDED.proof_rubric,
            is_active = EXCLUDED.is_active,
            updated_at = NOW()
        RETURNING id`,
        [
            challenge.code,
            challenge.title,
            challenge.description,
            challenge.category,
            challenge.difficulty,
            challenge.points,
            challenge.flagValue,
            challenge.prerequisiteChallengeCode || null,
            challenge.targetService,
            challenge.targetEndpoint,
            challenge.vulnerabilityType,
            challenge.attackVector,
            JSON.stringify(challenge.learningObjectives || []),
            challenge.estimatedMinutes,
            JSON.stringify(challenge.missionBrief || {}),
            JSON.stringify(challenge.incidentArtifacts || []),
            JSON.stringify(challenge.proofRubric || {}),
            challenge.isActive,
        ]
    );

    const challengeId = challengeResult.rows[0]?.id;
    if (!challengeId) {
        return;
    }

    await query('DELETE FROM learning.ctf_guided_steps WHERE challenge_id = $1', [challengeId]);
    await query('DELETE FROM learning.ctf_hints WHERE challenge_id = $1', [challengeId]);

    for (const step of challenge.guidedSteps) {
        await query(
            `INSERT INTO learning.ctf_guided_steps (
                challenge_id,
                step_number,
                step_title,
                step_description,
                step_type,
                command_template,
                expected_output,
                hint_text
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                challengeId,
                step.stepNumber,
                step.stepTitle,
                step.stepDescription,
                step.stepType,
                step.commandTemplate || null,
                step.expectedOutput || null,
                step.hintText || null,
            ]
        );
    }

    for (const hint of challenge.hints) {
        await query(
            `INSERT INTO learning.ctf_hints (challenge_id, hint_number, hint_text, cost_points)
             VALUES ($1, $2, $3, $4)`,
            [challengeId, hint.hintNumber, hint.hintText, hint.costPoints]
        );
    }
}

async function seedCtfChallengesIfNeeded(): Promise<void> {
    const countResult = await query('SELECT COUNT(*)::INTEGER AS count FROM learning.ctf_challenges');
    const challengeCount = parseInt(countResult.rows[0]?.count, 10) || 0;
    const refreshMode = challengeCount >= CTF_TOTAL_ACTIVE_CHALLENGES;

    for (const challenge of CTF_CHALLENGES) {
        await upsertChallengeSeed(challenge);
    }

    // Keep only the canonical THM-like 5 rooms active and hide legacy challenges.
    await query(
        `UPDATE learning.ctf_challenges
         SET is_active = false,
             updated_at = NOW()
         WHERE is_active = true
           AND NOT (challenge_code = ANY($1::text[]))`,
        [ACTIVE_ROOM_CODES]
    );

    logger.info('CTF challenge seed completed', {
        seededChallenges: CTF_CHALLENGES.length,
        refreshMode,
    });
}

async function ensureCtfSeeded(): Promise<void> {
    if (seedInitialized) {
        return;
    }

    if (!seedInFlight) {
        seedInFlight = seedCtfChallengesIfNeeded()
            .then(() => {
                seedInitialized = true;
            })
            .catch((error: any) => {
                logger.error('Failed to seed CTF content', { error: error.message });
                throw error;
            })
            .finally(() => {
                seedInFlight = null;
            });
    }

    await seedInFlight;
}

async function getChallengeByCode(rawChallengeCode: string) {
    const challengeCode = resolveChallengeCode(rawChallengeCode);
    if (!challengeCode || !ACTIVE_ROOM_CODE_SET.has(challengeCode)) {
        return null;
    }

    const challengeResult = await query(
        `SELECT *
         FROM learning.ctf_challenges
         WHERE challenge_code = $1
           AND is_active = true
         LIMIT 1`,
        [challengeCode]
    );

    return challengeResult.rows[0] || null;
}

function serializeChallenge(challenge: any, options: { redactSpoilers?: boolean } = {}) {
    const seed = CTF_CHALLENGE_BY_CODE.get(challenge.challenge_code);
    const missionBriefFromDb = parseJsonObject(challenge.mission_brief);
    const incidentArtifactsFromDb = parseJsonArray(challenge.incident_artifacts);
    const proofRubricFromDb = parseJsonObject(challenge.proof_rubric);

    // Redact fields that would give away the solution before the challenge is solved.
    // targetEndpoint, attackVector and commandTemplates in guided steps are hidden
    // until the student completes the challenge (TryHackMe-style: discover it yourself).
    const spoilersHidden = options.redactSpoilers !== false;

    return {
        id: challenge.id,
        code: challenge.challenge_code,
        workflowMode: getChallengeWorkflowMode(challenge.challenge_code),
        title: challenge.title,
        description: challenge.description,
        category: challenge.category,
        difficulty: challenge.difficulty,
        points: Number(challenge.points),
        prerequisiteChallengeCode: challenge.prerequisite_challenge_code,
        targetService: challenge.target_service,
        // Hidden until solved: prevents students from skipping reconnaissance
        targetEndpoint: spoilersHidden ? null : challenge.target_endpoint,
        vulnerabilityType: challenge.vulnerability_type,
        // Hidden until solved: attackVector would hint at the exact exploit path
        attackVector: spoilersHidden ? null : challenge.attack_vector,
        learningObjectives: Array.isArray(challenge.learning_objectives)
            ? challenge.learning_objectives
            : [],
        estimatedMinutes: Number(challenge.estimated_minutes || 15),
        isActive: Boolean(challenge.is_active),
        relatedWorkshopPath: seed?.relatedWorkshopPath || null,
        missionBrief: Object.keys(missionBriefFromDb).length > 0
            ? missionBriefFromDb
            : (seed?.missionBrief || {}),
        incidentArtifacts: incidentArtifactsFromDb.length > 0
            ? incidentArtifactsFromDb
            : (seed?.incidentArtifacts || []),
        proofRubric: Object.keys(proofRubricFromDb).length > 0
            ? proofRubricFromDb
            : (seed?.proofRubric || {}),
        debriefTemplate: seed?.debriefTemplate || {},
    };
}

export const getChallenges = async (req: Request, res: Response) => {
    try {
        await ensureCtfSeeded();

        const studentId = getStudentId(req);
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const [challengeRows, progressRows, completedRows] = await Promise.all([
            query(
                `SELECT
                    c.*,
                    COALESCE(s.solve_count, 0)::INTEGER AS solve_count
                 FROM learning.ctf_challenges c
                 LEFT JOIN (
                    SELECT challenge_id, COUNT(DISTINCT student_id)::INTEGER AS solve_count
                    FROM learning.ctf_submissions
                    WHERE is_correct = true
                    GROUP BY challenge_id
                 ) s ON s.challenge_id = c.id
                 WHERE c.is_active = true
                   AND c.challenge_code = ANY($1::text[])
                 ORDER BY c.category ASC, c.challenge_code ASC`,
                [ACTIVE_ROOM_CODES]
            ),
            query(
                `SELECT challenge_id, status, mode_preference, current_guided_step, hints_unlocked, started_at, completed_at, failed_attempts, learner_profile, debrief_completed, last_activity_at
                 FROM learning.ctf_student_progress
                 WHERE student_id = $1`,
                [studentId]
            ),
            query(
                `SELECT DISTINCT c.challenge_code
                 FROM learning.ctf_submissions s
                 JOIN learning.ctf_challenges c ON c.id = s.challenge_id
                 WHERE s.student_id = $1
                   AND s.is_correct = true
                   AND c.is_active = true
                   AND c.challenge_code = ANY($2::text[])`,
                [studentId, ACTIVE_ROOM_CODES]
            ),
        ]);

        const progressByChallengeId = new Map(progressRows.rows.map((row) => [row.challenge_id, row]));
        const completedCodes = new Set(completedRows.rows.map((row) => row.challenge_code));

        const challenges = challengeRows.rows.map((challenge) => {
            const progress = progressByChallengeId.get(challenge.id);
            const prerequisiteCode = challenge.prerequisite_challenge_code || null;

            const inferredStatus: CtfStatus = progress?.status
                || (!prerequisiteCode || completedCodes.has(prerequisiteCode)
                    ? 'UNLOCKED'
                    : 'LOCKED');

            return {
                ...serializeChallenge(challenge, { redactSpoilers: !completedCodes.has(challenge.challenge_code) }),
                status: inferredStatus,
                modePreference: progress?.mode_preference || 'GUIDED',
                learnerProfile: parseLearnerProfile(progress?.learner_profile || 'INTERMEDIATE'),
                currentGuidedStep: Number(progress?.current_guided_step || 1),
                hintsUnlocked: normalizeIntArray(progress?.hints_unlocked),
                failedAttempts: Number(progress?.failed_attempts || 0),
                debriefCompleted: Boolean(progress?.debrief_completed),
                startedAt: progress?.started_at || null,
                completedAt: progress?.completed_at || null,
                lastActivityAt: progress?.last_activity_at || null,
                solveCount: Number(challenge.solve_count || 0),
            };
        });

        res.json({
            success: true,
            challenges,
            total: challenges.length,
        });
    } catch (error: any) {
        logger.error('CTF getChallenges failed', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch CTF challenges' });
    }
};

export const getChallengeDetail = async (req: Request, res: Response) => {
    try {
        await ensureCtfSeeded();

        const studentId = getStudentId(req);
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const challengeCode = resolveChallengeCode(req.params.code);
        const challenge = await getChallengeByCode(challengeCode);

        if (!challenge) {
            return res.status(404).json({ success: false, error: 'Challenge not found' });
        }

        const progressResult = await query(
            `SELECT *
             FROM learning.ctf_student_progress
             WHERE student_id = $1
               AND challenge_id = $2
             LIMIT 1`,
            [studentId, challenge.id]
        );
        const progress = progressResult.rows[0] || null;

        const prerequisiteMet = await isPrerequisiteCompleted(studentId, challenge.prerequisite_challenge_code || null);
        const unlocked = progress?.status !== 'LOCKED' && prerequisiteMet;

        const isCompleted = progress?.status === 'COMPLETED';
        const challengePayload = serializeChallenge(challenge, { redactSpoilers: !isCompleted });
        const workflowMode = getChallengeWorkflowMode(challenge.challenge_code);
        const mode = parseMode(req.query.mode || progress?.mode_preference || 'GUIDED');
        const learnerProfile = parseLearnerProfile(req.query.profile || progress?.learner_profile || 'INTERMEDIATE');

        if (!unlocked && !progress) {
            return res.status(403).json({
                success: false,
                error: 'Challenge is locked. Complete prerequisite first.',
                challenge: {
                    ...challengePayload,
                    status: 'LOCKED',
                },
            });
        }

        if (progress && progress.learner_profile !== learnerProfile) {
            await query(
                `UPDATE learning.ctf_student_progress
                 SET learner_profile = $3, last_activity_at = NOW(), updated_at = NOW()
                 WHERE student_id = $1 AND challenge_id = $2`,
                [studentId, challenge.id, learnerProfile]
            );
        }

        const hintRows = await query(
            `SELECT hint_number, hint_text, cost_points
             FROM learning.ctf_hints
             WHERE challenge_id = $1
             ORDER BY hint_number ASC`,
            [challenge.id]
        );

        const hintsUnlocked = normalizeIntArray(progress?.hints_unlocked);
        const failedAttempts = Number(progress?.failed_attempts || 0);
        const startedAt = progress?.started_at || null;
        const hints = hintRows.rows.map((row) => {
            const hintNumber = Number(row.hint_number);
            const unlockedHint = hintsUnlocked.includes(hintNumber);
            const unlockPolicy = evaluateHintUnlockPolicy({
                hintNumber,
                hintsUnlocked,
                failedAttempts,
                startedAt,
            });

            return {
                hintNumber,
                costPoints: Number(row.cost_points || 10),
                unlocked: unlockedHint,
                eligible: unlockedHint || unlockPolicy.allowed,
                unlockPolicy: {
                    minMinutes: unlockPolicy.minMinutes,
                    minFailedAttempts: unlockPolicy.minFailedAttempts,
                    requiredPreviousHint: unlockPolicy.requiredPreviousHint,
                    elapsedMinutes: unlockPolicy.elapsedMinutes,
                    failedAttempts: unlockPolicy.failedAttempts,
                },
                lockedReason: !unlockedHint && !unlockPolicy.allowed ? unlockPolicy.reasons.join(' ') : null,
                hintText: unlockedHint ? row.hint_text : null,
            };
        });

        let debriefRow: any = null;
        try {
            const debriefResult = await query(
                `SELECT root_cause, impact_summary, mitigation_priorities, evidence_summary, technical_score, communication_score, patch_score, completed, updated_at
                 FROM learning.ctf_debriefs
                 WHERE student_id = $1
                   AND challenge_id = $2
                 LIMIT 1`,
                [studentId, challenge.id]
            );
            debriefRow = debriefResult.rows[0] || null;
        } catch {
            debriefRow = null;
        }

        const debrief = debriefRow
            ? {
                rootCause: debriefRow.root_cause,
                impactSummary: debriefRow.impact_summary,
                mitigationPriorities: parseJsonArray(debriefRow.mitigation_priorities).map((entry) => String(entry)),
                evidenceSummary: debriefRow.evidence_summary,
                technicalScore: Number(debriefRow.technical_score || 0),
                communicationScore: Number(debriefRow.communication_score || 0),
                patchScore: Number(debriefRow.patch_score || 0),
                completed: Boolean(debriefRow.completed),
                updatedAt: debriefRow.updated_at || null,
            }
            : null;

        const labContext = await getLabSessionForChallenge(studentId, challengeCode)
            .catch((error: any) => {
                logger.warn('CTF getChallengeDetail lab context unavailable', {
                    challengeCode,
                    studentId,
                    error: error.message,
                });
                return { session: null, tasks: [] as any[] };
            });

        await recordCtfLearningEvent({
            studentId,
            challengeId: challenge.id,
            eventName: 'challenge_view',
            payload: {
                challengeCode,
                mode,
                learnerProfile,
                challengeStatus: progress?.status || 'UNLOCKED',
            },
        });

        if (mode === 'GUIDED') {
            const stepsResult = await query(
                `SELECT step_number, step_title, step_description, step_type, command_template, expected_output, hint_text
                 FROM learning.ctf_guided_steps
                 WHERE challenge_id = $1
                 ORDER BY step_number ASC`,
                [challenge.id]
            );

            const totalSteps = stepsResult.rows.length;
            const currentGuidedStep = Math.max(1, Number(progress?.current_guided_step || 1));
            const maxVisibleStep = progress?.status === 'COMPLETED'
                ? totalSteps
                : Math.min(currentGuidedStep, totalSteps);
            const revealCommands = isCompleted || workflowMode === 'TASK_VALIDATION';

            const guidedSteps = stepsResult.rows
                .filter((step) => Number(step.step_number) <= maxVisibleStep)
                .map((step) => {
                    const normalizedStep = {
                        stepNumber: Number(step.step_number),
                        stepTitle: step.step_title,
                        stepDescription: step.step_description,
                        stepType: step.step_type,
                        commandTemplate: revealCommands ? step.command_template : null,
                        expectedOutput: step.expected_output,
                        hintText: step.hint_text,
                    };

                    const adaptiveGuidance = buildAdaptiveGuidance(
                        {
                            stepTitle: normalizedStep.stepTitle,
                            stepType: normalizedStep.stepType,
                            commandTemplate: normalizedStep.commandTemplate,
                        },
                        learnerProfile
                    );

                    return {
                        ...normalizedStep,
                        adaptiveGuidance,
                    };
                });

            return res.json({
                success: true,
                challenge: {
                    ...challengePayload,
                    status: progress?.status || 'UNLOCKED',
                    started: Boolean(progress),
                    labSession: labContext.session,
                    labTasks: labContext.tasks,
                    mode,
                    currentGuidedStep,
                    totalSteps,
                    hintsUnlocked,
                    failedAttempts,
                    learnerProfile,
                    adaptiveProfiles: ['NOVICE', 'INTERMEDIATE', 'ADVANCED'],
                    adaptivePathNotes: {
                        NOVICE: 'Step-by-step with stronger execution scaffolding.',
                        INTERMEDIATE: 'Balanced guidance with autonomy on decisions.',
                        ADVANCED: 'Minimal guidance focused on evidence quality and speed.',
                    },
                    hints,
                    guidedSteps,
                    debrief,
                },
            });
        }

        return res.json({
            success: true,
            challenge: {
                ...challengePayload,
                status: progress?.status || 'UNLOCKED',
                started: Boolean(progress),
                labSession: labContext.session,
                labTasks: labContext.tasks,
                mode,
                learnerProfile,
                failedAttempts,
                freeModeDescription: CTF_CHALLENGE_BY_CODE.get(challenge.challenge_code)?.freeModeDescription
                    || challenge.description,
                hints,
                hintsUnlocked,
                debrief,
            },
        });
    } catch (error: any) {
        logger.error('CTF getChallengeDetail failed', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch challenge detail' });
    }
};

export const startChallenge = async (req: Request, res: Response) => {
    try {
        await ensureCtfSeeded();
        await cleanupExpiredLabSessions().catch((error: any) => {
            logger.warn('CTF startChallenge cleanupExpiredLabSessions failed', { error: error.message });
        });

        const studentId = getStudentId(req);
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const challengeCode = resolveChallengeCode(req.params.code);
        const mode = parseMode(req.body?.mode);
        const learnerProfile = parseLearnerProfile(req.body?.learnerProfile || 'INTERMEDIATE');

        const challenge = await getChallengeByCode(challengeCode);
        if (!challenge) {
            return res.status(404).json({ success: false, error: 'Challenge not found' });
        }
        const prerequisiteMet = await isPrerequisiteCompleted(studentId, challenge.prerequisite_challenge_code || null);
        if (!prerequisiteMet) {
            return res.status(403).json({
                success: false,
                error: `Challenge locked. Complete prerequisite ${challenge.prerequisite_challenge_code}`,
            });
        }

        const progressResult = await query(
            `INSERT INTO learning.ctf_student_progress
                (student_id, challenge_id, status, mode_preference, learner_profile, current_guided_step, started_at, last_activity_at)
             VALUES
                ($1, $2, 'IN_PROGRESS', $3, $4, 1, NOW(), NOW())
             ON CONFLICT (student_id, challenge_id)
             DO UPDATE SET
                status = CASE
                    WHEN learning.ctf_student_progress.status = 'COMPLETED' THEN learning.ctf_student_progress.status
                    ELSE 'IN_PROGRESS'
                END,
                mode_preference = EXCLUDED.mode_preference,
                learner_profile = EXCLUDED.learner_profile,
                started_at = COALESCE(learning.ctf_student_progress.started_at, NOW()),
                last_activity_at = NOW(),
                updated_at = NOW()
             RETURNING status, mode_preference, learner_profile, current_guided_step, started_at, completed_at`,
            [studentId, challenge.id, mode, learnerProfile]
        );

        const challengeSeed = CTF_CHALLENGE_BY_CODE.get(challenge.challenge_code);
        await initStudentVulnForChallenge(
            studentId,
            challenge.challenge_code,
            challengeSeed?.initialVulnConfig || {},
        );

        const lab = await startOrReuseLabSession(studentId, challenge.challenge_code);

        await recordCtfLearningEvent({
            studentId,
            challengeId: challenge.id,
            eventName: 'challenge_start',
            payload: {
                challengeCode,
                mode,
                learnerProfile,
            },
        });

        res.json({
            success: true,
            challengeCode,
            progress: progressResult.rows[0],
            session: lab.session,
            tasks: lab.tasks,
        });
    } catch (error: any) {
        return handleLabError(res, error, 'Failed to start challenge');
    }
};

export const getChallengeSession = async (req: Request, res: Response) => {
    try {
        const studentId = getStudentId(req);
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const challengeCode = resolveChallengeCode(req.params.code);
        if (!challengeCode) {
            return res.status(400).json({ success: false, error: 'Missing challenge code' });
        }
        if (!ACTIVE_ROOM_CODE_SET.has(challengeCode)) {
            return res.status(404).json({ success: false, error: 'Challenge not found' });
        }

        const context = await getLabSessionForChallenge(studentId, challengeCode);
        return res.json({
            success: true,
            challengeCode,
            session: context.session,
            tasks: context.tasks,
        });
    } catch (error: any) {
        return handleLabError(res, error, 'Failed to fetch challenge session');
    }
};

export const extendChallengeSession = async (req: Request, res: Response) => {
    try {
        const studentId = getStudentId(req);
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const sessionId = String(req.params.sessionId || '').trim();
        if (!sessionId) {
            return res.status(400).json({ success: false, error: 'Missing sessionId' });
        }

        const session = await extendLabSession(studentId, sessionId);
        return res.json({ success: true, session });
    } catch (error: any) {
        return handleLabError(res, error, 'Failed to extend challenge session');
    }
};

export const resetChallengeSession = async (req: Request, res: Response) => {
    try {
        const studentId = getStudentId(req);
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const sessionId = String(req.params.sessionId || '').trim();
        if (!sessionId) {
            return res.status(400).json({ success: false, error: 'Missing sessionId' });
        }

        const session = await resetLabSession(studentId, sessionId);
        return res.json({ success: true, session });
    } catch (error: any) {
        return handleLabError(res, error, 'Failed to reset challenge session');
    }
};

export const terminateChallengeSession = async (req: Request, res: Response) => {
    try {
        const studentId = getStudentId(req);
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const sessionId = String(req.params.sessionId || '').trim();
        if (!sessionId) {
            return res.status(400).json({ success: false, error: 'Missing sessionId' });
        }

        const session = await terminateLabSession(studentId, sessionId);
        return res.json({ success: true, session });
    } catch (error: any) {
        return handleLabError(res, error, 'Failed to terminate challenge session');
    }
};

export const resolveLabSessionAccess = async (req: Request, res: Response) => {
    try {
        const expectedSecret = getInternalProxySecret();
        const providedSecret = String(req.headers['x-internal-secret'] || '');
        if (!expectedSecret || providedSecret !== expectedSecret) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }

        const studentId = getStudentId(req) || String(req.headers['x-student-id'] || '').trim() || null;
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const sessionCode = String(req.params.sessionCode || '').trim();
        if (!sessionCode) {
            return res.status(400).json({ success: false, error: 'Missing sessionCode' });
        }

        const target = await resolveLabProxyTarget(studentId, sessionCode);
        return res.json({
            success: true,
            sessionId: target.sessionId,
            targetUrl: target.targetUrl,
        });
    } catch (error: any) {
        return handleLabError(res, error, 'Failed to resolve session access');
    }
};

export const submitGuidedStepAnswer = async (req: Request, res: Response) => {
    try {
        await ensureCtfSeeded();

        const studentId = getStudentId(req);
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const challengeCode = resolveChallengeCode(req.params.code);
        const challenge = await getChallengeByCode(challengeCode);
        if (!challenge) {
            return res.status(404).json({ success: false, error: 'Challenge not found' });
        }

        const workflowMode = getChallengeWorkflowMode(challenge.challenge_code);
        if (workflowMode !== 'TASK_VALIDATION') {
            return res.status(400).json({
                success: false,
                error: 'Guided step validation is not enabled for this challenge',
            });
        }

        const stepNumber = Number(req.params.number);
        if (!Number.isInteger(stepNumber) || stepNumber <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid step number' });
        }

        const submittedAnswer = String(req.body?.answer ?? req.body?.submittedAnswer ?? '').trim();
        if (!submittedAnswer) {
            return res.status(400).json({ success: false, error: 'answer is required' });
        }

        const prerequisiteMet = await isPrerequisiteCompleted(studentId, challenge.prerequisite_challenge_code || null);
        if (!prerequisiteMet) {
            return res.status(403).json({
                success: false,
                error: `Challenge locked. Complete prerequisite ${challenge.prerequisite_challenge_code}`,
            });
        }

        const progressResult = await query(
            `SELECT *
             FROM learning.ctf_student_progress
             WHERE student_id = $1
               AND challenge_id = $2
             LIMIT 1`,
            [studentId, challenge.id]
        );
        const progress = progressResult.rows[0];
        if (!progress) {
            return res.status(400).json({ success: false, error: 'Challenge not started yet' });
        }

        if (progress.mode_preference !== 'GUIDED') {
            return res.status(400).json({ success: false, error: 'Current challenge mode is not GUIDED' });
        }

        const stepCountResult = await query(
            `SELECT COUNT(*)::INTEGER AS total_steps
             FROM learning.ctf_guided_steps
             WHERE challenge_id = $1`,
            [challenge.id]
        );
        const totalSteps = parseInt(stepCountResult.rows[0]?.total_steps, 10) || 1;
        const currentGuidedStep = Math.max(1, Math.min(totalSteps, Number(progress.current_guided_step || 1)));

        if (progress.status === 'COMPLETED') {
            return res.json({
                success: true,
                result: {
                    isCorrect: true,
                    alreadyCompleted: true,
                    completed: true,
                    message: 'Challenge already completed.',
                    stepNumber,
                    currentGuidedStep: totalSteps,
                    totalSteps,
                    failedAttempts: Number(progress.failed_attempts || 0),
                },
            });
        }

        if (stepNumber !== currentGuidedStep) {
            return res.status(409).json({
                success: false,
                error: `Submit the current step first (expected step ${currentGuidedStep}).`,
                expectedStep: currentGuidedStep,
            });
        }

        const validation = validateGuidedStepAnswer(challenge.challenge_code, stepNumber, submittedAnswer);
        if (!validation.isCorrect) {
            const failedUpdate = await query(
                `UPDATE learning.ctf_student_progress
                 SET
                    failed_attempts = COALESCE(failed_attempts, 0) + 1,
                    status = CASE
                        WHEN status = 'UNLOCKED' THEN 'IN_PROGRESS'
                        ELSE status
                    END,
                    last_activity_at = NOW(),
                    updated_at = NOW()
                 WHERE student_id = $1
                   AND challenge_id = $2
                 RETURNING failed_attempts, current_guided_step, status`,
                [studentId, challenge.id]
            );

            await recordCtfLearningEvent({
                studentId,
                challengeId: challenge.id,
                eventName: 'guided_step_submit',
                payload: {
                    challengeCode,
                    stepNumber,
                    totalSteps,
                    isCorrect: false,
                    workflowMode,
                },
            });

            return res.json({
                success: true,
                result: {
                    isCorrect: false,
                    completed: false,
                    message: validation.message,
                    stepNumber,
                    currentGuidedStep: Number(failedUpdate.rows[0]?.current_guided_step || currentGuidedStep),
                    totalSteps,
                    failedAttempts: Number(failedUpdate.rows[0]?.failed_attempts || 0),
                    status: failedUpdate.rows[0]?.status || progress.status,
                },
            });
        }

        const isFinalStep = stepNumber >= totalSteps;
        if (!isFinalStep) {
            const nextStep = Math.min(totalSteps, currentGuidedStep + 1);
            const updateResult = await query(
                `UPDATE learning.ctf_student_progress
                 SET
                    current_guided_step = $3,
                    status = CASE
                        WHEN status = 'UNLOCKED' THEN 'IN_PROGRESS'
                        ELSE status
                    END,
                    last_activity_at = NOW(),
                    updated_at = NOW()
                 WHERE student_id = $1
                   AND challenge_id = $2
                 RETURNING current_guided_step, failed_attempts, status`,
                [studentId, challenge.id, nextStep]
            );

            await recordCtfLearningEvent({
                studentId,
                challengeId: challenge.id,
                eventName: 'guided_step_submit',
                payload: {
                    challengeCode,
                    stepNumber,
                    totalSteps,
                    isCorrect: true,
                    completed: false,
                    workflowMode,
                },
            });

            return res.json({
                success: true,
                result: {
                    isCorrect: true,
                    completed: false,
                    message: validation.message,
                    stepNumber,
                    currentGuidedStep: Number(updateResult.rows[0]?.current_guided_step || nextStep),
                    totalSteps,
                    failedAttempts: Number(updateResult.rows[0]?.failed_attempts || progress.failed_attempts || 0),
                    status: updateResult.rows[0]?.status || progress.status,
                },
            });
        }

        const mode = parseMode(progress.mode_preference || 'GUIDED');
        const learnerProfile = parseLearnerProfile(progress.learner_profile || 'INTERMEDIATE');
        const hintsUnlocked = normalizeIntArray(progress?.hints_unlocked);
        const hintsUsed = hintsUnlocked.length;
        const failedAttempts = Number(progress?.failed_attempts || 0);

        const hintCostResult = hintsUsed > 0
            ? await query(
                `SELECT COALESCE(SUM(cost_points), 0)::INTEGER AS total_hint_cost
                 FROM learning.ctf_hints
                 WHERE challenge_id = $1
                   AND hint_number = ANY($2::int[])`,
                [challenge.id, hintsUnlocked]
            )
            : { rows: [{ total_hint_cost: 0 }] } as any;

        const totalHintCost = parseInt(hintCostResult.rows[0]?.total_hint_cost, 10) || 0;

        const existingCorrectResult = await query(
            `SELECT EXISTS (
                SELECT 1
                FROM learning.ctf_submissions
                WHERE student_id = $1
                  AND challenge_id = $2
                  AND is_correct = true
            ) AS already_solved`,
            [studentId, challenge.id]
        );
        const alreadySolved = Boolean(existingCorrectResult.rows[0]?.already_solved);

        let isFirstBlood = false;
        let pointsAwarded = 0;
        let unlockedCount = 0;
        let awardedBadges: string[] = [];
        let scoringResult = calculateMultiAxisScore({
            basePoints: Number(challenge.points || 0),
            estimatedMinutes: Number(challenge.estimated_minutes || 15),
            startedAt: progress?.started_at || null,
            submittedAt: new Date(),
            hintsUsed,
            hintCost: totalHintCost,
            incorrectAttempts: failedAttempts,
            mode,
            isFirstBlood: false,
        });

        if (!alreadySolved) {
            const firstBloodResult = await query(
                `SELECT COUNT(*)::INTEGER AS solved_count
                 FROM learning.ctf_submissions
                 WHERE challenge_id = $1
                   AND is_correct = true`,
                [challenge.id]
            );
            const solvedCount = parseInt(firstBloodResult.rows[0]?.solved_count, 10) || 0;
            isFirstBlood = solvedCount === 0;

            const legacyPoints = calculatePoints(
                Number(challenge.points),
                hintsUsed,
                totalHintCost,
                isFirstBlood
            );
            scoringResult = calculateMultiAxisScore({
                basePoints: Number(challenge.points || 0),
                estimatedMinutes: Number(challenge.estimated_minutes || 15),
                startedAt: progress?.started_at || null,
                submittedAt: new Date(),
                hintsUsed,
                hintCost: totalHintCost,
                incorrectAttempts: failedAttempts,
                mode,
                isFirstBlood,
            });

            pointsAwarded = Math.max(
                10,
                Math.round((legacyPoints * 0.4) + (scoringResult.suggestedPoints * 0.6))
            );
        }

        const feedback = deriveFeedbackPatterns({
            submittedFlag: `TASK_VALIDATION:${challengeCode}:STEP:${stepNumber}`,
            isCorrect: true,
            hintsUsed,
            incorrectAttempts: failedAttempts,
            elapsedMinutes: scoringResult.elapsedMinutes,
            estimatedMinutes: Number(challenge.estimated_minutes || 15),
            mode,
            axisTotalScore: scoringResult.axisTotalScore,
            debriefCompleteness: scoringResult.debriefCompleteness,
        });
        const feedbackCodes = feedback.map((item) => item.code);

        await query(
            `INSERT INTO learning.ctf_submissions
                (student_id, challenge_id, submitted_flag, is_correct, mode, points_awarded, hints_used, is_first_blood, axis_time_score, axis_proof_score, axis_patch_score, axis_total_score, scoring_version, feedback_codes, submission_metadata, submitted_at)
             VALUES ($1, $2, $3, true, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb, NOW())`,
            [
                studentId,
                challenge.id,
                submittedAnswer,
                mode,
                pointsAwarded,
                hintsUsed,
                isFirstBlood,
                scoringResult.timeScore,
                scoringResult.proofScore,
                scoringResult.patchScore,
                scoringResult.axisTotalScore,
                scoringResult.scoringVersion,
                JSON.stringify(feedbackCodes),
                JSON.stringify({
                    learnerProfile,
                    workflowMode,
                    completedBy: 'guided_step_validation',
                    failedAttempts,
                    elapsedMinutes: scoringResult.elapsedMinutes,
                }),
            ]
        );

        if (!alreadySolved) {
            await query(
                `UPDATE learning.ctf_student_progress
                 SET
                    status = 'COMPLETED',
                    current_guided_step = GREATEST(
                        current_guided_step,
                        COALESCE((
                            SELECT MAX(step_number)
                            FROM learning.ctf_guided_steps
                            WHERE challenge_id = $2
                        ), current_guided_step)
                    ),
                    completed_at = NOW(),
                    debrief_completed = COALESCE(debrief_completed, false),
                    last_activity_at = NOW(),
                    updated_at = NOW()
                 WHERE student_id = $1
                   AND challenge_id = $2`,
                [studentId, challenge.id]
            );

            unlockedCount = await unlockNextChallenges(studentId, challenge.challenge_code);
            awardedBadges = await awardCtfBadges(studentId);
        } else {
            await query(
                `UPDATE learning.ctf_student_progress
                 SET
                    status = 'COMPLETED',
                    current_guided_step = GREATEST(current_guided_step, $3),
                    completed_at = COALESCE(completed_at, NOW()),
                    last_activity_at = NOW(),
                    updated_at = NOW()
                 WHERE student_id = $1
                   AND challenge_id = $2`,
                [studentId, challenge.id, totalSteps]
            );
        }

        await recordCtfLearningEvent({
            studentId,
            challengeId: challenge.id,
            eventName: 'guided_step_submit',
            payload: {
                challengeCode,
                stepNumber,
                totalSteps,
                isCorrect: true,
                completed: true,
                workflowMode,
                alreadySolved,
                pointsAwarded,
                unlockedCount,
                feedbackCodes,
            },
        });

        return res.json({
            success: true,
            result: {
                isCorrect: true,
                completed: true,
                alreadySolved,
                message: validation.message,
                stepNumber,
                currentGuidedStep: totalSteps,
                totalSteps,
                pointsAwarded,
                unlockedCount,
                awardedBadges,
                failedAttempts,
                feedback,
                debriefRequired: Boolean(!alreadySolved),
            },
        });
    } catch (error: any) {
        logger.error('CTF submitGuidedStepAnswer failed', { error: error.message });
        return res.status(500).json({ success: false, error: 'Failed to submit guided step answer' });
    }
};

export const advanceGuidedStep = async (req: Request, res: Response) => {
    try {
        await ensureCtfSeeded();

        const studentId = getStudentId(req);
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const challengeCode = resolveChallengeCode(req.params.code);
        const challenge = await getChallengeByCode(challengeCode);

        if (!challenge) {
            return res.status(404).json({ success: false, error: 'Challenge not found' });
        }

        if (getChallengeWorkflowMode(challenge.challenge_code) === 'TASK_VALIDATION') {
            return res.status(400).json({
                success: false,
                error: 'This room requires validated answers. Use step submission endpoint.',
            });
        }

        const progressResult = await query(
            `SELECT *
             FROM learning.ctf_student_progress
             WHERE student_id = $1
               AND challenge_id = $2
             LIMIT 1`,
            [studentId, challenge.id]
        );

        const progress = progressResult.rows[0];
        if (!progress) {
            return res.status(400).json({ success: false, error: 'Challenge not started yet' });
        }

        if (progress.mode_preference !== 'GUIDED') {
            return res.status(400).json({ success: false, error: 'Current challenge mode is not GUIDED' });
        }

        const stepCountResult = await query(
            `SELECT COUNT(*)::INTEGER AS total_steps
             FROM learning.ctf_guided_steps
             WHERE challenge_id = $1`,
            [challenge.id]
        );

        const totalSteps = parseInt(stepCountResult.rows[0]?.total_steps, 10) || 1;
        const nextStep = Math.min(totalSteps, Number(progress.current_guided_step || 1) + 1);

        const updateResult = await query(
            `UPDATE learning.ctf_student_progress
             SET
                current_guided_step = $3,
                status = CASE
                    WHEN status = 'UNLOCKED' THEN 'IN_PROGRESS'
                    ELSE status
                END,
                last_activity_at = NOW(),
                updated_at = NOW()
             WHERE student_id = $1
               AND challenge_id = $2
             RETURNING current_guided_step, status`,
            [studentId, challenge.id, nextStep]
        );

        await recordCtfLearningEvent({
            studentId,
            challengeId: challenge.id,
            eventName: 'guided_step_advance',
            payload: {
                challengeCode,
                currentStep: Number(updateResult.rows[0]?.current_guided_step || nextStep),
                totalSteps,
            },
        });

        res.json({
            success: true,
            currentGuidedStep: Number(updateResult.rows[0]?.current_guided_step || nextStep),
            totalSteps,
            status: updateResult.rows[0]?.status || progress.status,
        });
    } catch (error: any) {
        logger.error('CTF advanceGuidedStep failed', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to advance guided step' });
    }
};

export const submitFlag = async (req: Request, res: Response) => {
    try {
        await ensureCtfSeeded();

        const studentId = getStudentId(req);
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const challengeCode = resolveChallengeCode(req.params.code);
        const submittedFlagRaw = String(req.body?.submittedFlag ?? req.body?.flag ?? '');
        const submittedFlag = submittedFlagRaw.trim();
        if (!submittedFlag) {
            return res.status(400).json({ success: false, error: 'submittedFlag is required' });
        }

        const challenge = await getChallengeByCode(challengeCode);
        if (!challenge) {
            return res.status(404).json({ success: false, error: 'Challenge not found' });
        }

        if (getChallengeWorkflowMode(challenge.challenge_code) === 'TASK_VALIDATION') {
            return res.status(400).json({
                success: false,
                error: 'This room uses step-by-step task validation instead of direct flag submission.',
            });
        }

        const prerequisiteMet = await isPrerequisiteCompleted(studentId, challenge.prerequisite_challenge_code || null);
        if (!prerequisiteMet) {
            return res.status(403).json({
                success: false,
                error: `Challenge locked. Complete prerequisite ${challenge.prerequisite_challenge_code}`,
            });
        }

        const mode = parseMode(req.body?.mode);
        const learnerProfile = parseLearnerProfile(req.body?.learnerProfile || 'INTERMEDIATE');

        const progressUpsert = await query(
            `INSERT INTO learning.ctf_student_progress
                (student_id, challenge_id, status, mode_preference, learner_profile, current_guided_step, started_at, last_activity_at)
             VALUES ($1, $2, 'IN_PROGRESS', $3, $4, 1, NOW(), NOW())
             ON CONFLICT (student_id, challenge_id)
             DO UPDATE SET
                status = CASE
                    WHEN learning.ctf_student_progress.status = 'LOCKED' THEN 'IN_PROGRESS'
                    ELSE learning.ctf_student_progress.status
                END,
                mode_preference = EXCLUDED.mode_preference,
                learner_profile = EXCLUDED.learner_profile,
                started_at = COALESCE(learning.ctf_student_progress.started_at, NOW()),
                last_activity_at = NOW(),
                updated_at = NOW()
             RETURNING *`,
            [studentId, challenge.id, mode, learnerProfile]
        );

        const progress = progressUpsert.rows[0];
        const hintsUnlocked = normalizeIntArray(progress?.hints_unlocked);
        const hintsUsed = hintsUnlocked.length;
        const failedAttemptsBefore = Number(progress?.failed_attempts || 0);

        const hintCostResult = hintsUsed > 0
            ? await query(
                `SELECT COALESCE(SUM(cost_points), 0)::INTEGER AS total_hint_cost
                 FROM learning.ctf_hints
                 WHERE challenge_id = $1
                   AND hint_number = ANY($2::int[])`,
                [challenge.id, hintsUnlocked]
            )
            : { rows: [{ total_hint_cost: 0 }] } as any;

        const totalHintCost = parseInt(hintCostResult.rows[0]?.total_hint_cost, 10) || 0;

        const isCorrect = validateFlag(submittedFlag, challenge.flag_value, studentId, challengeCode);
        const attemptsAfterSubmit = isCorrect ? failedAttemptsBefore : failedAttemptsBefore + 1;

        const existingCorrectResult = await query(
            `SELECT EXISTS (
                SELECT 1
                FROM learning.ctf_submissions
                WHERE student_id = $1
                  AND challenge_id = $2
                  AND is_correct = true
            ) AS already_solved`,
            [studentId, challenge.id]
        );

        const alreadySolved = Boolean(existingCorrectResult.rows[0]?.already_solved);

        let isFirstBlood = false;
        let pointsAwarded = 0;
        let unlockedCount = 0;
        let awardedBadges: string[] = [];
        let scoringResult = calculateMultiAxisScore({
            basePoints: Number(challenge.points || 0),
            estimatedMinutes: Number(challenge.estimated_minutes || 15),
            startedAt: progress?.started_at || null,
            submittedAt: new Date(),
            hintsUsed,
            hintCost: totalHintCost,
            incorrectAttempts: attemptsAfterSubmit,
            mode,
            isFirstBlood: false,
        });

        if (isCorrect && !alreadySolved) {
            const firstBloodResult = await query(
                `SELECT COUNT(*)::INTEGER AS solved_count
                 FROM learning.ctf_submissions
                 WHERE challenge_id = $1
                   AND is_correct = true`,
                [challenge.id]
            );

            const solvedCount = parseInt(firstBloodResult.rows[0]?.solved_count, 10) || 0;
            isFirstBlood = solvedCount === 0;
            const legacyPoints = calculatePoints(
                Number(challenge.points),
                hintsUsed,
                totalHintCost,
                isFirstBlood
            );
            scoringResult = calculateMultiAxisScore({
                basePoints: Number(challenge.points || 0),
                estimatedMinutes: Number(challenge.estimated_minutes || 15),
                startedAt: progress?.started_at || null,
                submittedAt: new Date(),
                hintsUsed,
                hintCost: totalHintCost,
                incorrectAttempts: attemptsAfterSubmit,
                mode,
                isFirstBlood,
            });

            pointsAwarded = Math.max(
                10,
                Math.round((legacyPoints * 0.4) + (scoringResult.suggestedPoints * 0.6))
            );
        }

        const feedback = deriveFeedbackPatterns({
            submittedFlag: submittedFlagRaw,
            isCorrect,
            hintsUsed,
            incorrectAttempts: attemptsAfterSubmit,
            elapsedMinutes: scoringResult.elapsedMinutes,
            estimatedMinutes: Number(challenge.estimated_minutes || 15),
            mode,
            axisTotalScore: scoringResult.axisTotalScore,
            debriefCompleteness: scoringResult.debriefCompleteness,
        });
        const feedbackCodes = feedback.map((item) => item.code);

        await query(
            `INSERT INTO learning.ctf_submissions
                (student_id, challenge_id, submitted_flag, is_correct, mode, points_awarded, hints_used, is_first_blood, axis_time_score, axis_proof_score, axis_patch_score, axis_total_score, scoring_version, feedback_codes, submission_metadata, submitted_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15::jsonb, NOW())`,
            [
                studentId,
                challenge.id,
                submittedFlag,
                isCorrect,
                mode,
                pointsAwarded,
                hintsUsed,
                isFirstBlood,
                scoringResult.timeScore,
                scoringResult.proofScore,
                scoringResult.patchScore,
                scoringResult.axisTotalScore,
                scoringResult.scoringVersion,
                JSON.stringify(feedbackCodes),
                JSON.stringify({
                    learnerProfile,
                    elapsedMinutes: scoringResult.elapsedMinutes,
                    failedAttempts: attemptsAfterSubmit,
                }),
            ]
        );

        if (isCorrect && !alreadySolved) {
            await query(
                `UPDATE learning.ctf_student_progress
                 SET
                    status = 'COMPLETED',
                    current_guided_step = GREATEST(
                        current_guided_step,
                        COALESCE((
                            SELECT MAX(step_number)
                            FROM learning.ctf_guided_steps
                            WHERE challenge_id = $2
                        ), current_guided_step)
                    ),
                    completed_at = NOW(),
                    debrief_completed = COALESCE(debrief_completed, false),
                    last_activity_at = NOW(),
                    updated_at = NOW()
                 WHERE student_id = $1
                   AND challenge_id = $2`,
                [studentId, challenge.id]
            );

            unlockedCount = await unlockNextChallenges(studentId, challenge.challenge_code);
            awardedBadges = await awardCtfBadges(studentId);
        } else if (!isCorrect) {
            await query(
                `UPDATE learning.ctf_student_progress
                 SET
                    failed_attempts = COALESCE(failed_attempts, 0) + 1,
                    status = CASE
                        WHEN status = 'UNLOCKED' THEN 'IN_PROGRESS'
                        ELSE status
                    END,
                    last_activity_at = NOW(),
                    updated_at = NOW()
                 WHERE student_id = $1
                   AND challenge_id = $2`,
                [studentId, challenge.id]
            );
        }

        await recordCtfLearningEvent({
            studentId,
            challengeId: challenge.id,
            eventName: 'flag_submission',
            payload: {
                challengeCode,
                isCorrect,
                alreadySolved,
                mode,
                learnerProfile,
                hintsUsed,
                failedAttempts: attemptsAfterSubmit,
                axisTotalScore: scoringResult.axisTotalScore,
                feedbackCodes,
            },
        });

        res.json({
            success: true,
            result: {
                challengeCode,
                isCorrect,
                alreadySolved,
                mode,
                pointsAwarded,
                hintsUsed,
                isFirstBlood,
                unlockedCount,
                awardedBadges,
                axisScores: {
                    time: scoringResult.timeScore,
                    proof: scoringResult.proofScore,
                    patch: scoringResult.patchScore,
                    total: scoringResult.axisTotalScore,
                },
                feedback,
                failedAttempts: attemptsAfterSubmit,
                debriefRequired: Boolean(isCorrect && !alreadySolved),
            },
        });
    } catch (error: any) {
        logger.error('CTF submitFlag failed', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to submit flag' });
    }
};

export const unlockHint = async (req: Request, res: Response) => {
    try {
        await ensureCtfSeeded();

        const studentId = getStudentId(req);
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const challengeCode = resolveChallengeCode(req.params.code);
        const hintNumber = Number(req.params.number);
        if (!Number.isInteger(hintNumber) || hintNumber <= 0) {
            return res.status(400).json({ success: false, error: 'Invalid hint number' });
        }

        const challenge = await getChallengeByCode(challengeCode);
        if (!challenge) {
            return res.status(404).json({ success: false, error: 'Challenge not found' });
        }

        const progressResult = await query(
            `SELECT *
             FROM learning.ctf_student_progress
             WHERE student_id = $1
               AND challenge_id = $2
             LIMIT 1`,
            [studentId, challenge.id]
        );
        const progress = progressResult.rows[0];

        if (!progress) {
            return res.status(400).json({ success: false, error: 'Start challenge first before unlocking hints' });
        }

        const hintResult = await query(
            `SELECT hint_number, hint_text, cost_points
             FROM learning.ctf_hints
             WHERE challenge_id = $1
               AND hint_number = $2
             LIMIT 1`,
            [challenge.id, hintNumber]
        );

        if ((hintResult.rowCount ?? 0) === 0) {
            return res.status(404).json({ success: false, error: 'Hint not found' });
        }

        const currentHints = normalizeIntArray(progress.hints_unlocked);
        const alreadyUnlocked = currentHints.includes(hintNumber);
        const unlockPolicy = evaluateHintUnlockPolicy({
            hintNumber,
            hintsUnlocked: currentHints,
            failedAttempts: Number(progress.failed_attempts || 0),
            startedAt: progress.started_at,
        });

        if (!alreadyUnlocked && !unlockPolicy.allowed) {
            await recordCtfLearningEvent({
                studentId,
                challengeId: challenge.id,
                eventName: 'hint_blocked',
                payload: {
                    challengeCode,
                    hintNumber,
                    reasons: unlockPolicy.reasons,
                    elapsedMinutes: unlockPolicy.elapsedMinutes,
                    failedAttempts: unlockPolicy.failedAttempts,
                },
            });

            return res.status(423).json({
                success: false,
                error: unlockPolicy.reasons.join(' '),
                unlockPolicy,
            });
        }

        if (!alreadyUnlocked) {
            await query(
                `UPDATE learning.ctf_student_progress
                 SET
                    hints_unlocked = CASE
                        WHEN hints_unlocked @> ARRAY[$3]::INTEGER[] THEN hints_unlocked
                        ELSE array_append(hints_unlocked, $3)
                    END,
                    last_activity_at = NOW(),
                    updated_at = NOW()
                 WHERE student_id = $1
                   AND challenge_id = $2`,
                [studentId, challenge.id, hintNumber]
            );
        }

        await recordCtfLearningEvent({
            studentId,
            challengeId: challenge.id,
            eventName: 'hint_unlock',
            payload: {
                challengeCode,
                hintNumber,
                alreadyUnlocked,
                minMinutes: unlockPolicy.minMinutes,
                minFailedAttempts: unlockPolicy.minFailedAttempts,
            },
        });

        res.json({
            success: true,
            hint: {
                hintNumber,
                hintText: hintResult.rows[0].hint_text,
                costPoints: Number(hintResult.rows[0].cost_points || 10),
                alreadyUnlocked,
                unlockPolicy,
            },
        });
    } catch (error: any) {
        logger.error('CTF unlockHint failed', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to unlock hint' });
    }
};

export const getDebrief = async (req: Request, res: Response) => {
    try {
        await ensureCtfSeeded();

        const studentId = getStudentId(req);
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const challengeCode = resolveChallengeCode(req.params.code);
        const challenge = await getChallengeByCode(challengeCode);
        if (!challenge) {
            return res.status(404).json({ success: false, error: 'Challenge not found' });
        }

        const debriefResult = await query(
            `SELECT root_cause, impact_summary, mitigation_priorities, evidence_summary, technical_score, communication_score, patch_score, completed, updated_at
             FROM learning.ctf_debriefs
             WHERE student_id = $1
               AND challenge_id = $2
             LIMIT 1`,
            [studentId, challenge.id]
        );

        const row = debriefResult.rows[0] || null;
        const seed = CTF_CHALLENGE_BY_CODE.get(challenge.challenge_code);

        res.json({
            success: true,
            challengeCode,
            template: seed?.debriefTemplate || {},
            debrief: row
                ? {
                    rootCause: row.root_cause,
                    impactSummary: row.impact_summary,
                    mitigationPriorities: parseJsonArray(row.mitigation_priorities).map((entry) => String(entry)),
                    evidenceSummary: row.evidence_summary,
                    technicalScore: Number(row.technical_score || 0),
                    communicationScore: Number(row.communication_score || 0),
                    patchScore: Number(row.patch_score || 0),
                    completed: Boolean(row.completed),
                    updatedAt: row.updated_at || null,
                }
                : null,
        });
    } catch (error: any) {
        logger.error('CTF getDebrief failed', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch debrief' });
    }
};

export const submitDebrief = async (req: Request, res: Response) => {
    try {
        await ensureCtfSeeded();

        const studentId = getStudentId(req);
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const challengeCode = resolveChallengeCode(req.params.code);
        const challenge = await getChallengeByCode(challengeCode);
        if (!challenge) {
            return res.status(404).json({ success: false, error: 'Challenge not found' });
        }

        const solvedSubmissionResult = await query(
            `SELECT id, mode, hints_used, is_first_blood
             FROM learning.ctf_submissions
             WHERE student_id = $1
               AND challenge_id = $2
               AND is_correct = true
             ORDER BY submitted_at ASC
             LIMIT 1`,
            [studentId, challenge.id]
        );

        if ((solvedSubmissionResult.rowCount ?? 0) === 0) {
            return res.status(400).json({
                success: false,
                error: 'Solve challenge first before submitting debrief',
            });
        }

        const debriefDraft = buildDebriefDraft(req.body);
        if (!debriefDraft) {
            return res.status(400).json({ success: false, error: 'Debrief payload is required' });
        }

        if (debriefDraft.rootCause.length < 60 || debriefDraft.impactSummary.length < 60 || debriefDraft.evidenceSummary.length < 80) {
            return res.status(400).json({
                success: false,
                error: 'Debrief too short. Add stronger root cause, impact, and evidence details.',
            });
        }

        if (debriefDraft.mitigationPriorities.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Provide at least 2 prioritized mitigation actions.',
            });
        }

        const clamp = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));
        const technicalScore = clamp(
            (Math.min(debriefDraft.rootCause.length, 240) / 240) * 45
            + (Math.min(debriefDraft.evidenceSummary.length, 280) / 280) * 35
            + (Math.min(debriefDraft.mitigationPriorities.length, 4) / 4) * 20
        );
        const communicationScore = clamp(
            (Math.min(debriefDraft.impactSummary.length, 260) / 260) * 55
            + (Math.min(debriefDraft.rootCause.length, 200) / 200) * 20
            + (Math.min(debriefDraft.mitigationPriorities.length, 4) / 4) * 25
        );
        const patchScore = clamp(
            (Math.min(debriefDraft.mitigationPriorities.length, 4) / 4) * 50
            + (Math.min(debriefDraft.evidenceSummary.length, 260) / 260) * 35
            + (debriefDraft.evidenceSummary.toLowerCase().includes('avant') || debriefDraft.evidenceSummary.toLowerCase().includes('before') ? 15 : 0)
        );

        await query(
            `INSERT INTO learning.ctf_debriefs
                (student_id, challenge_id, root_cause, impact_summary, mitigation_priorities, evidence_summary, technical_score, communication_score, patch_score, completed)
             VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, true)
             ON CONFLICT (student_id, challenge_id)
             DO UPDATE SET
                root_cause = EXCLUDED.root_cause,
                impact_summary = EXCLUDED.impact_summary,
                mitigation_priorities = EXCLUDED.mitigation_priorities,
                evidence_summary = EXCLUDED.evidence_summary,
                technical_score = EXCLUDED.technical_score,
                communication_score = EXCLUDED.communication_score,
                patch_score = EXCLUDED.patch_score,
                completed = true,
                updated_at = NOW()`,
            [
                studentId,
                challenge.id,
                debriefDraft.rootCause,
                debriefDraft.impactSummary,
                JSON.stringify(debriefDraft.mitigationPriorities),
                debriefDraft.evidenceSummary,
                technicalScore,
                communicationScore,
                patchScore,
            ]
        );

        const progressResult = await query(
            `SELECT started_at, failed_attempts, mode_preference, hints_unlocked
             FROM learning.ctf_student_progress
             WHERE student_id = $1
               AND challenge_id = $2
             LIMIT 1`,
            [studentId, challenge.id]
        );
        const progress = progressResult.rows[0] || null;
        const hintsUnlocked = normalizeIntArray(progress?.hints_unlocked);
        const hintsUsed = hintsUnlocked.length;

        const hintCostResult = hintsUsed > 0
            ? await query(
                `SELECT COALESCE(SUM(cost_points), 0)::INTEGER AS total_hint_cost
                 FROM learning.ctf_hints
                 WHERE challenge_id = $1
                   AND hint_number = ANY($2::int[])`,
                [challenge.id, hintsUnlocked]
            )
            : { rows: [{ total_hint_cost: 0 }] } as any;

        const totalHintCost = parseInt(hintCostResult.rows[0]?.total_hint_cost, 10) || 0;
        const solvedSubmission = solvedSubmissionResult.rows[0];
        const mode = parseMode(progress?.mode_preference || solvedSubmission.mode || 'GUIDED');
        const isFirstBlood = Boolean(solvedSubmission.is_first_blood);

        const scoringResult = calculateMultiAxisScore({
            basePoints: Number(challenge.points || 0),
            estimatedMinutes: Number(challenge.estimated_minutes || 15),
            startedAt: progress?.started_at || null,
            submittedAt: new Date(),
            hintsUsed,
            hintCost: totalHintCost,
            incorrectAttempts: Number(progress?.failed_attempts || 0),
            mode,
            isFirstBlood,
            debrief: {
                ...debriefDraft,
                technicalScore,
                communicationScore,
                patchScore,
            },
        });

        const legacyPoints = calculatePoints(
            Number(challenge.points || 0),
            hintsUsed,
            totalHintCost,
            isFirstBlood
        );
        const adjustedPoints = Math.max(
            10,
            Math.round((legacyPoints * 0.3) + (scoringResult.suggestedPoints * 0.7))
        );

        const feedback = deriveFeedbackPatterns({
            submittedFlag: 'PMP{debrief}',
            isCorrect: true,
            hintsUsed,
            incorrectAttempts: Number(progress?.failed_attempts || 0),
            elapsedMinutes: scoringResult.elapsedMinutes,
            estimatedMinutes: Number(challenge.estimated_minutes || 15),
            mode,
            axisTotalScore: scoringResult.axisTotalScore,
            debriefCompleteness: scoringResult.debriefCompleteness,
            rootCauseLength: debriefDraft.rootCause.length,
            mitigationCount: debriefDraft.mitigationPriorities.length,
            evidenceLength: debriefDraft.evidenceSummary.length,
        });
        const feedbackCodes = feedback.map((item) => item.code);

        await query(
            `UPDATE learning.ctf_submissions
             SET
                points_awarded = $2,
                axis_time_score = $3,
                axis_proof_score = $4,
                axis_patch_score = $5,
                axis_total_score = $6,
                scoring_version = $7,
                feedback_codes = $8::jsonb,
                submission_metadata = submission_metadata || $9::jsonb
             WHERE id = $1`,
            [
                solvedSubmission.id,
                adjustedPoints,
                scoringResult.timeScore,
                scoringResult.proofScore,
                scoringResult.patchScore,
                scoringResult.axisTotalScore,
                scoringResult.scoringVersion,
                JSON.stringify(feedbackCodes),
                JSON.stringify({
                    debriefCompleteness: scoringResult.debriefCompleteness,
                    debriefUpdatedAt: new Date().toISOString(),
                }),
            ]
        );

        await query(
            `UPDATE learning.ctf_student_progress
             SET
                debrief_completed = true,
                last_activity_at = NOW(),
                updated_at = NOW()
             WHERE student_id = $1
               AND challenge_id = $2`,
            [studentId, challenge.id]
        );

        await recordCtfLearningEvent({
            studentId,
            challengeId: challenge.id,
            eventName: 'debrief_submitted',
            payload: {
                challengeCode,
                technicalScore,
                communicationScore,
                patchScore,
                axisTotalScore: scoringResult.axisTotalScore,
                feedbackCodes,
            },
        });

        res.json({
            success: true,
            challengeCode,
            debrief: {
                ...debriefDraft,
                technicalScore,
                communicationScore,
                patchScore,
                completeness: calculateDebriefCompleteness({
                    ...debriefDraft,
                    technicalScore,
                    communicationScore,
                    patchScore,
                }),
            },
            scoring: {
                time: scoringResult.timeScore,
                proof: scoringResult.proofScore,
                patch: scoringResult.patchScore,
                total: scoringResult.axisTotalScore,
                pointsAwarded: adjustedPoints,
            },
            feedback,
        });
    } catch (error: any) {
        logger.error('CTF submitDebrief failed', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to submit debrief' });
    }
};

export const getProgress = async (req: Request, res: Response) => {
    try {
        await ensureCtfSeeded();

        const studentId = getStudentId(req);
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const [progressRows, scoreRows, solvedRows, totalRows, axisRows, debriefRows] = await Promise.all([
            query(
                `SELECT
                    p.status,
                    p.mode_preference,
                    p.learner_profile,
                    p.current_guided_step,
                    p.hints_unlocked,
                    p.failed_attempts,
                    p.debrief_completed,
                    p.started_at,
                    p.completed_at,
                    c.challenge_code,
                    c.title,
                    c.points,
                    c.category,
                    c.difficulty
                 FROM learning.ctf_student_progress p
                 JOIN learning.ctf_challenges c ON c.id = p.challenge_id
                 WHERE p.student_id = $1
                   AND c.is_active = true
                   AND c.challenge_code = ANY($2::text[])
                 ORDER BY c.challenge_code ASC`,
                [studentId, ACTIVE_ROOM_CODES]
            ),
            query(
                `SELECT COALESCE(SUM(s.points_awarded), 0)::INTEGER AS total_points
                 FROM learning.ctf_submissions s
                 JOIN learning.ctf_challenges c ON c.id = s.challenge_id
                 WHERE s.student_id = $1
                   AND s.is_correct = true
                   AND c.is_active = true
                   AND c.challenge_code = ANY($2::text[])`,
                [studentId, ACTIVE_ROOM_CODES]
            ),
            query(
                `SELECT COUNT(DISTINCT s.challenge_id)::INTEGER AS solved_count
                 FROM learning.ctf_submissions s
                 JOIN learning.ctf_challenges c ON c.id = s.challenge_id
                 WHERE s.student_id = $1
                   AND s.is_correct = true
                   AND c.is_active = true
                   AND c.challenge_code = ANY($2::text[])`,
                [studentId, ACTIVE_ROOM_CODES]
            ),
            query(
                `SELECT COUNT(*)::INTEGER AS total_count
                 FROM learning.ctf_challenges
                 WHERE is_active = true
                   AND challenge_code = ANY($1::text[])`,
                [ACTIVE_ROOM_CODES]
            ),
            query(
                `SELECT
                    COALESCE(ROUND(AVG(axis_time_score), 2), 0) AS avg_time_score,
                    COALESCE(ROUND(AVG(axis_proof_score), 2), 0) AS avg_proof_score,
                    COALESCE(ROUND(AVG(axis_patch_score), 2), 0) AS avg_patch_score,
                    COALESCE(ROUND(AVG(axis_total_score), 2), 0) AS avg_axis_score
                 FROM learning.ctf_submissions s
                 JOIN learning.ctf_challenges c ON c.id = s.challenge_id
                 WHERE s.student_id = $1
                   AND s.is_correct = true
                   AND c.is_active = true
                   AND c.challenge_code = ANY($2::text[])`,
                [studentId, ACTIVE_ROOM_CODES]
            ),
            query(
                `SELECT COUNT(*)::INTEGER AS debrief_count
                 FROM learning.ctf_debriefs d
                 JOIN learning.ctf_challenges c ON c.id = d.challenge_id
                 WHERE d.student_id = $1
                   AND c.is_active = true
                   AND c.challenge_code = ANY($2::text[])`,
                [studentId, ACTIVE_ROOM_CODES]
            ),
        ]);

        const progress = progressRows.rows.map((row) => ({
            challengeCode: row.challenge_code,
            title: row.title,
            category: row.category,
            difficulty: row.difficulty,
            points: Number(row.points || 0),
            status: row.status,
            modePreference: row.mode_preference,
            learnerProfile: parseLearnerProfile(row.learner_profile || 'INTERMEDIATE'),
            currentGuidedStep: Number(row.current_guided_step || 1),
            hintsUnlocked: normalizeIntArray(row.hints_unlocked),
            failedAttempts: Number(row.failed_attempts || 0),
            debriefCompleted: Boolean(row.debrief_completed),
            startedAt: row.started_at,
            completedAt: row.completed_at,
        }));

        res.json({
            success: true,
            progress,
            summary: {
                totalPoints: parseInt(scoreRows.rows[0]?.total_points, 10) || 0,
                solvedChallenges: parseInt(solvedRows.rows[0]?.solved_count, 10) || 0,
                totalChallenges: parseInt(totalRows.rows[0]?.total_count, 10) || 0,
                debriefCount: parseInt(debriefRows.rows[0]?.debrief_count, 10) || 0,
                averageAxisScores: {
                    time: Number(axisRows.rows[0]?.avg_time_score || 0),
                    proof: Number(axisRows.rows[0]?.avg_proof_score || 0),
                    patch: Number(axisRows.rows[0]?.avg_patch_score || 0),
                    total: Number(axisRows.rows[0]?.avg_axis_score || 0),
                },
            },
        });
    } catch (error: any) {
        logger.error('CTF getProgress failed', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch CTF progress' });
    }
};

export const getLeaderboard = async (req: Request, res: Response) => {
    try {
        await ensureCtfSeeded();

        const requestedLimit = parseInt(String(req.query.limit || '50'), 10);
        const limit = Number.isFinite(requestedLimit)
            ? Math.max(1, Math.min(200, requestedLimit))
            : 50;

        const result = await query(
            `SELECT student_id, username, first_name, last_name, challenges_solved, total_points, first_bloods, rank
             FROM learning.ctf_leaderboard
             ORDER BY rank ASC
             LIMIT $1`,
            [limit]
        );

        res.json({
            success: true,
            leaderboard: result.rows,
            total: result.rows.length,
        });
    } catch (error: any) {
        logger.error('CTF getLeaderboard failed', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch CTF leaderboard' });
    }
};

export const getAdminSubmissions = async (_req: Request, res: Response) => {
    try {
        await ensureCtfSeeded();

        const result = await query(
            `SELECT
                s.id,
                s.submitted_flag,
                s.is_correct,
                s.mode,
                s.points_awarded,
                s.hints_used,
                s.is_first_blood,
                s.axis_time_score,
                s.axis_proof_score,
                s.axis_patch_score,
                s.axis_total_score,
                s.feedback_codes,
                s.submission_metadata,
                s.submitted_at,
                c.challenge_code,
                c.title,
                u.id AS student_id,
                u.username,
                u.first_name,
                u.last_name
             FROM learning.ctf_submissions s
             JOIN learning.ctf_challenges c ON c.id = s.challenge_id
             JOIN users.users u ON u.id = s.student_id
             ORDER BY s.submitted_at DESC
             LIMIT 1000`
        );

        res.json({
            success: true,
            submissions: result.rows,
            total: result.rows.length,
        });
    } catch (error: any) {
        logger.error('CTF getAdminSubmissions failed', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch CTF submissions' });
    }
};

export const getAdminAnalytics = async (_req: Request, res: Response) => {
    try {
        await ensureCtfSeeded();

        const [
            challengeStats,
            blockedStudents,
            dropoffByChallenge,
            debriefCoverage,
            feedbackHotspots,
            learnerProfileDistribution,
            stepBlockage,
            telemetryVolume,
        ] = await Promise.all([
            query(
                `SELECT
                    c.challenge_code,
                    c.title,
                    c.category,
                    c.difficulty,
                    c.points,
                    COUNT(s.id)::INTEGER AS attempts,
                    COUNT(*) FILTER (WHERE s.is_correct = true)::INTEGER AS successful_submissions,
                    COUNT(DISTINCT CASE WHEN s.is_correct = true THEN s.student_id END)::INTEGER AS unique_solvers,
                    COALESCE(ROUND(
                        (COUNT(*) FILTER (WHERE s.is_correct = true)::NUMERIC / NULLIF(COUNT(s.id), 0)) * 100,
                        2
                    ), 0) AS resolution_rate,
                    COALESCE(ROUND(AVG(
                        EXTRACT(EPOCH FROM (p.completed_at - p.started_at)) / 60
                    ) FILTER (
                        WHERE p.completed_at IS NOT NULL AND p.started_at IS NOT NULL
                    ), 2), 0) AS avg_completion_minutes,
                    COALESCE(ROUND(AVG(s.axis_time_score) FILTER (WHERE s.is_correct = true), 2), 0) AS avg_time_score,
                    COALESCE(ROUND(AVG(s.axis_proof_score) FILTER (WHERE s.is_correct = true), 2), 0) AS avg_proof_score,
                    COALESCE(ROUND(AVG(s.axis_patch_score) FILTER (WHERE s.is_correct = true), 2), 0) AS avg_patch_score,
                    COALESCE(ROUND(AVG(s.axis_total_score) FILTER (WHERE s.is_correct = true), 2), 0) AS avg_axis_score,
                    COALESCE(o.dropoff_rate, 0) AS dropoff_rate,
                    COALESCE(o.debrief_coverage_rate, 0) AS debrief_coverage_rate
                 FROM learning.ctf_challenges c
                 LEFT JOIN learning.ctf_submissions s ON s.challenge_id = c.id
                 LEFT JOIN learning.ctf_student_progress p
                    ON p.challenge_id = c.id
                    AND p.student_id = s.student_id
                 LEFT JOIN learning.ctf_trainer_overview o ON o.challenge_id = c.id
                 WHERE c.is_active = true
                 GROUP BY c.id, c.challenge_code, c.title, c.category, c.difficulty, c.points, o.dropoff_rate, o.debrief_coverage_rate
                 ORDER BY c.challenge_code ASC`
            ),
            query(
                `SELECT
                    u.id AS student_id,
                    u.username,
                    u.first_name,
                    u.last_name,
                    c.challenge_code,
                    c.title,
                    p.current_guided_step,
                    p.failed_attempts,
                    p.learner_profile,
                    p.started_at,
                    ROUND(EXTRACT(EPOCH FROM (NOW() - p.started_at)) / 3600, 2) AS hours_in_progress
                 FROM learning.ctf_student_progress p
                 JOIN users.users u ON u.id = p.student_id
                 JOIN learning.ctf_challenges c ON c.id = p.challenge_id
                 WHERE p.status = 'IN_PROGRESS'
                   AND p.started_at IS NOT NULL
                   AND p.started_at < (NOW() - INTERVAL '2 HOURS')
                 ORDER BY hours_in_progress DESC
                 LIMIT 200`
            ),
            query(
                `SELECT
                    challenge_code,
                    title,
                    category,
                    started_count,
                    completed_count,
                    in_progress_count,
                    dropoff_rate
                 FROM learning.ctf_trainer_overview
                 ORDER BY dropoff_rate DESC, started_count DESC
                 LIMIT 30`
            ),
            query(
                `SELECT
                    challenge_code,
                    title,
                    completed_count,
                    debrief_count,
                    debrief_coverage_rate
                 FROM learning.ctf_trainer_overview
                 ORDER BY debrief_coverage_rate ASC, completed_count DESC
                 LIMIT 30`
            ),
            query(
                `SELECT
                    feedback_code,
                    COUNT(*)::INTEGER AS occurrences
                 FROM learning.ctf_submissions s,
                 LATERAL jsonb_array_elements_text(COALESCE(s.feedback_codes, '[]'::jsonb)) AS feedback_code
                 WHERE s.submitted_at > (NOW() - INTERVAL '30 DAYS')
                 GROUP BY feedback_code
                 ORDER BY occurrences DESC
                 LIMIT 20`
            ),
            query(
                `SELECT
                    learner_profile,
                    COUNT(*)::INTEGER AS learners
                 FROM learning.ctf_student_progress
                 GROUP BY learner_profile
                 ORDER BY learners DESC`
            ),
            query(
                `SELECT
                    c.challenge_code,
                    c.title,
                    p.current_guided_step,
                    COUNT(*)::INTEGER AS blocked_learners
                 FROM learning.ctf_student_progress p
                 JOIN learning.ctf_challenges c ON c.id = p.challenge_id
                 WHERE p.status = 'IN_PROGRESS'
                 GROUP BY c.challenge_code, c.title, p.current_guided_step
                 ORDER BY blocked_learners DESC, c.challenge_code ASC
                 LIMIT 30`
            ),
            query(
                `SELECT
                    event_name,
                    COUNT(*)::INTEGER AS events_24h
                 FROM learning.ctf_learning_events
                 WHERE created_at > (NOW() - INTERVAL '24 HOURS')
                 GROUP BY event_name
                 ORDER BY events_24h DESC`
            ),
        ]);

        res.json({
            success: true,
            analytics: {
                challengeStats: challengeStats.rows,
                blockedStudents: blockedStudents.rows,
                dropoffByChallenge: dropoffByChallenge.rows,
                debriefCoverage: debriefCoverage.rows,
                feedbackHotspots: feedbackHotspots.rows,
                learnerProfileDistribution: learnerProfileDistribution.rows,
                stepBlockage: stepBlockage.rows,
                telemetryVolume: telemetryVolume.rows,
            },
        });
    } catch (error: any) {
        logger.error('CTF getAdminAnalytics failed', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to fetch CTF analytics' });
    }
};

export const resetStudentProgress = async (req: Request, res: Response) => {
    try {
        await ensureCtfSeeded();

        const { studentId } = req.params;
        if (!studentId) {
            return res.status(400).json({ success: false, error: 'studentId is required' });
        }

        const userCheck = await query(
            `SELECT id
             FROM users.users
             WHERE id = $1
               AND role = 'ROLE_ETUDIANT'
             LIMIT 1`,
            [studentId]
        );

        if ((userCheck.rowCount ?? 0) === 0) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }

        const deletedSubmissions = await query(
            `DELETE FROM learning.ctf_submissions
             WHERE student_id = $1
             RETURNING id`,
            [studentId]
        );

        const deletedProgress = await query(
            `DELETE FROM learning.ctf_student_progress
             WHERE student_id = $1
             RETURNING id`,
            [studentId]
        );

        const deletedDebriefs = await query(
            `DELETE FROM learning.ctf_debriefs
             WHERE student_id = $1
             RETURNING id`,
            [studentId]
        );

        await query(
            `INSERT INTO learning.ctf_student_progress
                (student_id, challenge_id, status, mode_preference, current_guided_step)
             SELECT $1, c.id, 'UNLOCKED', 'GUIDED', 1
             FROM learning.ctf_challenges c
             WHERE c.is_active = true
               AND c.prerequisite_challenge_code IS NULL
             ON CONFLICT (student_id, challenge_id) DO NOTHING`,
            [studentId]
        );

        await resetStudentVuln(studentId);
        stopMitmBackgroundTraffic(studentId);

        res.json({
            success: true,
            message: 'CTF progression reset completed',
            deleted: {
                submissions: deletedSubmissions.rowCount || 0,
                progressRows: deletedProgress.rowCount || 0,
                debriefs: deletedDebriefs.rowCount || 0,
            },
        });
    } catch (error: any) {
        logger.error('CTF resetStudentProgress failed', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to reset student CTF progress' });
    }
};

export const saveLearningCheck = async (req: Request, res: Response) => {
    try {
        const studentId = getStudentId(req);
        if (!studentId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const challengeCode = resolveChallengeCode(req.params.code);
        const { vulnerabilityType, businessImpact, fixPriority } = req.body;

        const challenge = await getChallengeByCode(challengeCode);
        if (!challenge) {
            return res.status(404).json({ success: false, error: 'Challenge not found' });
        }

        await query(
            `INSERT INTO learning.ctf_learning_events
                (student_id, challenge_id, event_name, event_source, event_payload)
             VALUES ($1, $2, 'LEARNING_CHECK', 'frontend', $3::jsonb)`,
            [
                studentId,
                challenge.id,
                JSON.stringify({
                    vulnerabilityType: vulnerabilityType || null,
                    businessImpact: businessImpact || null,
                    fixPriority: fixPriority || null,
                }),
            ]
        );

        res.json({ success: true, message: 'Learning check saved.' });
    } catch (error: any) {
        logger.error('CTF saveLearningCheck failed', { error: error.message });
        res.status(500).json({ success: false, error: 'Failed to save learning check' });
    }
};

export const internalVulnInit = async (req: Request, res: Response) => {
    try {
        const expectedSecret = process.env.INTERNAL_HSM_SECRET;
        const providedSecret = req.headers['x-internal-secret'] as string | undefined;

        if (!expectedSecret || providedSecret !== expectedSecret) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }

        const studentId = String(req.body?.studentId || '').trim();
        const challengeCode = resolveChallengeCode(req.body?.challengeCode);
        const rawOverrides = req.body?.overrides;
        const overrides = rawOverrides && typeof rawOverrides === 'object'
            ? rawOverrides as Record<string, boolean>
            : {};

        if (!studentId || !challengeCode) {
            return res.status(400).json({ success: false, error: 'studentId and challengeCode are required' });
        }

        if (!ACTIVE_ROOM_CODE_SET.has(challengeCode)) {
            return res.status(400).json({ success: false, error: 'Unknown challengeCode' });
        }

        await initStudentVulnForChallenge(studentId, challengeCode, overrides);
        return res.json({ success: true, studentId, challengeCode });
    } catch (error: any) {
        logger.error('CTF internalVulnInit failed', { error: error.message });
        return res.status(500).json({ success: false, error: 'Failed to initialize vulnerability state' });
    }
};
