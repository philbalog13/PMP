import crypto from 'node:crypto';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import { generateFlag, isDynamicFlagChallenge } from './ctfFlag.service';

interface BadgeDefinition {
    badge_name: string;
    badge_description: string;
    badge_icon: string;
    xp_awarded: number;
}

const CTF_FIRST_BLOOD_BONUS = 50;

const FALLBACK_BADGE_DEFINITIONS: Record<string, BadgeDefinition> = {
    CTF_FIRST_FLAG: {
        badge_name: 'Premier Flag CTF',
        badge_description: 'Capturer votre premier flag CTF',
        badge_icon: 'flag',
        xp_awarded: 50,
    },
    CTF_FIRST_BLOOD: {
        badge_name: 'First Blood',
        badge_description: 'Etre le premier a resoudre un challenge',
        badge_icon: 'droplet',
        xp_awarded: 200,
    },
    CTF_HACKER: {
        badge_name: 'CTF Hacker',
        badge_description: 'Resoudre 10 challenges CTF',
        badge_icon: 'terminal',
        xp_awarded: 150,
    },
    CTF_MASTER: {
        badge_name: 'CTF Master',
        badge_description: 'Resoudre tous les challenges CTF actifs',
        badge_icon: 'crown',
        xp_awarded: 500,
    },
    CTF_CATEGORY_MASTER: {
        badge_name: 'Category Master',
        badge_description: 'Completer une categorie CTF complete',
        badge_icon: 'layers',
        xp_awarded: 100,
    },
    QUIZ_FIRST_PASS: {
        badge_name: 'Premier Quiz Réussi',
        badge_description: 'Réussir votre premier quiz de cursus',
        badge_icon: 'check-circle',
        xp_awarded: 30,
    },
    QUIZ_PERFECT: {
        badge_name: 'Score Parfait',
        badge_description: 'Obtenir 100% à un quiz de cursus',
        badge_icon: 'star',
        xp_awarded: 75,
    },
    QUIZ_ALL_PASSED: {
        badge_name: 'Cursus Complet',
        badge_description: 'Réussir tous les quiz d\'un cursus',
        badge_icon: 'award',
        xp_awarded: 200,
    },
    SPEED_DEMON: {
        badge_name: 'Speed Demon',
        badge_description: 'Résoudre un challenge en moins de 5 minutes',
        badge_icon: 'zap',
        xp_awarded: 100,
    },
    NO_HINTS: {
        badge_name: 'Sans Filet',
        badge_description: 'Résoudre 5 challenges sans utiliser d\'indice',
        badge_icon: 'eye-off',
        xp_awarded: 150,
    },
    CHAIN_BREAKER: {
        badge_name: 'Chain Breaker',
        badge_description: 'Compléter une chaîne de challenges complète',
        badge_icon: 'link-2',
        xp_awarded: 200,
    },
    BOSS_SLAYER: {
        badge_name: 'Boss Slayer',
        badge_description: 'Résoudre un challenge BOSS multi-stage',
        badge_icon: 'skull',
        xp_awarded: 300,
    },
    FULL_STACK_HACKER: {
        badge_name: 'Full Stack Hacker',
        badge_description: 'Résoudre au moins un challenge par catégorie',
        badge_icon: 'layers',
        xp_awarded: 250,
    },
    STREAK_7: {
        badge_name: 'Streak 7',
        badge_description: '7 jours consécutifs d\'activité CTF',
        badge_icon: 'flame',
        xp_awarded: 100,
    },
    WRITEUP_AUTHOR: {
        badge_name: 'Writeup Author',
        badge_description: 'Soumettre un writeup community approuvé',
        badge_icon: 'book-open',
        xp_awarded: 150,
    },
};

export interface StudentRank {
    rank: string;
    icon: string;
    minPoints: number;
    maxPoints: number | null;
}

const RANK_TIERS: StudentRank[] = [
    { rank: 'Script Kiddy', icon: '🔰', minPoints: 0, maxPoints: 499 },
    { rank: 'Padawan', icon: '⚔️', minPoints: 500, maxPoints: 1499 },
    { rank: 'Hunter', icon: '🎯', minPoints: 1500, maxPoints: 2999 },
    { rank: 'Elite Hacker', icon: '💀', minPoints: 3000, maxPoints: 4999 },
    { rank: 'Maître Monétique', icon: '👑', minPoints: 5000, maxPoints: 7999 },
    { rank: 'Légende', icon: '🏆', minPoints: 8000, maxPoints: null },
];

export function getRank(totalPoints: number): StudentRank {
    const safePoints = Math.max(0, Math.floor(totalPoints || 0));
    for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
        if (safePoints >= RANK_TIERS[i].minPoints) {
            return RANK_TIERS[i];
        }
    }
    return RANK_TIERS[0];
}

export function getAllRanks(): StudentRank[] {
    return [...RANK_TIERS];
}

function normalizeFlag(value: string): string {
    return value.trim().toUpperCase();
}

/**
 * Valide un flag soumis par un étudiant.
 *
 * Si le challenge supporte les flags dynamiques (isDynamicFlagChallenge) ET que studentId est fourni,
 * le flag attendu est recalculé via HMAC côté serveur — unique par étudiant, pas de triche par partage.
 *
 * Sinon, fallback sur la comparaison hash classique contre `staticExpected`.
 */
export function validateFlag(
    submitted: string,
    staticExpected: string,
    studentId?: string,
    challengeCode?: string
): boolean {
    if (!submitted) return false;

    // Mode dynamique : recalcul HMAC côté serveur
    if (studentId && challengeCode && isDynamicFlagChallenge(challengeCode)) {
        try {
            const expected = generateFlag(studentId, challengeCode);
            const submittedBuf = crypto.createHash('sha256').update(normalizeFlag(submitted)).digest();
            const expectedBuf = crypto.createHash('sha256').update(normalizeFlag(expected)).digest();
            if (submittedBuf.length === expectedBuf.length) {
                return crypto.timingSafeEqual(submittedBuf, expectedBuf);
            }
            return false;
        } catch {
            // Si la génération échoue (challenge inconnu), fallback sur static
        }
    }

    // Mode statique (backward compat ou challenge non dynamique)
    if (!staticExpected) return false;
    const submittedHash = crypto.createHash('sha256').update(normalizeFlag(submitted)).digest();
    const expectedHash = crypto.createHash('sha256').update(normalizeFlag(staticExpected)).digest();
    return crypto.timingSafeEqual(submittedHash, expectedHash);
}

export function calculatePoints(basePoints: number, hintsUsed: number, hintCost: number, isFirstBlood: boolean): number {
    const safeBasePoints = Number.isFinite(basePoints) ? Math.max(Math.floor(basePoints), 0) : 0;
    const safeHintsUsed = Number.isFinite(hintsUsed) ? Math.max(Math.floor(hintsUsed), 0) : 0;
    const safeHintCost = Number.isFinite(hintCost) ? Math.max(hintCost, 0) : 0;

    // `hintCost` is expected to be the cumulative unlocked hint cost for the challenge.
    const deduction = safeHintsUsed > 0 ? Math.round(safeHintCost) : 0;
    const firstBloodBonus = isFirstBlood ? CTF_FIRST_BLOOD_BONUS : 0;

    return Math.max(10, safeBasePoints - deduction + firstBloodBonus);
}

export async function unlockNextChallenges(studentId: string, completedCode: string): Promise<number> {
    const nextChallenges = await query(
        `SELECT id
         FROM learning.ctf_challenges
         WHERE prerequisite_challenge_code = $1
           AND is_active = true`,
        [completedCode]
    );

    let unlockedCount = 0;

    for (const row of nextChallenges.rows) {
        const result = await query(
            `INSERT INTO learning.ctf_student_progress
                (student_id, challenge_id, status, mode_preference, current_guided_step)
             VALUES
                ($1, $2, 'UNLOCKED', 'GUIDED', 1)
             ON CONFLICT (student_id, challenge_id)
             DO UPDATE SET
                status = CASE
                    WHEN learning.ctf_student_progress.status = 'LOCKED' THEN 'UNLOCKED'
                    ELSE learning.ctf_student_progress.status
                END,
                updated_at = NOW()
             RETURNING status`,
            [studentId, row.id]
        );

        if ((result.rowCount ?? 0) > 0) {
            unlockedCount += 1;
        }
    }

    return unlockedCount;
}

async function getBadgeDefinition(badgeType: string): Promise<BadgeDefinition | null> {
    try {
        const result = await query(
            `SELECT badge_name, badge_description, badge_icon, xp_awarded
             FROM learning.ctf_badge_catalog
             WHERE badge_type = $1
             LIMIT 1`,
            [badgeType]
        );

        if ((result.rowCount ?? 0) > 0) {
            return result.rows[0] as BadgeDefinition;
        }
    } catch (error: any) {
        logger.warn('CTF badge catalog unavailable, using fallback', { badgeType, error: error.message });
    }

    return FALLBACK_BADGE_DEFINITIONS[badgeType] || null;
}

async function awardCtfBadge(studentId: string, badgeType: string): Promise<boolean> {
    const definition = await getBadgeDefinition(badgeType);
    if (!definition) {
        return false;
    }

    try {
        const insertResult = await query(
            `INSERT INTO learning.badges
                (student_id, badge_type, badge_name, badge_description, badge_icon, xp_awarded)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (student_id, badge_type) DO NOTHING
             RETURNING id`,
            [
                studentId,
                badgeType,
                definition.badge_name,
                definition.badge_description,
                definition.badge_icon,
                definition.xp_awarded,
            ]
        );

        const awarded = (insertResult.rowCount ?? 0) > 0;
        if (awarded) {
            logger.info('CTF badge awarded', { studentId, badgeType });
        }

        return awarded;
    } catch (error: any) {
        logger.error('Failed to award CTF badge', { studentId, badgeType, error: error.message });
        return false;
    }
}

export async function awardCtfBadges(studentId: string): Promise<string[]> {
    const awardedBadgeTypes: string[] = [];

    const [
        firstFlagResult,
        firstBloodResult,
        solvedResult,
        totalResult,
        categoryResult,
    ] = await Promise.all([
        query(
            `SELECT EXISTS (
                SELECT 1
                FROM learning.ctf_submissions
                WHERE student_id = $1 AND is_correct = true
            ) AS has_first_flag`,
            [studentId]
        ),
        query(
            `SELECT EXISTS (
                SELECT 1
                FROM learning.ctf_submissions
                WHERE student_id = $1
                  AND is_correct = true
                  AND is_first_blood = true
            ) AS has_first_blood`,
            [studentId]
        ),
        query(
            `SELECT COUNT(DISTINCT challenge_id)::INTEGER AS solved_count
             FROM learning.ctf_submissions
             WHERE student_id = $1
               AND is_correct = true`,
            [studentId]
        ),
        query(
            `SELECT COUNT(*)::INTEGER AS total_count
             FROM learning.ctf_challenges
             WHERE is_active = true`
        ),
        query(
            `WITH all_by_category AS (
                SELECT category, COUNT(*)::INTEGER AS total
                FROM learning.ctf_challenges
                WHERE is_active = true
                GROUP BY category
            ),
            solved_by_category AS (
                SELECT c.category, COUNT(DISTINCT c.id)::INTEGER AS solved
                FROM learning.ctf_submissions s
                JOIN learning.ctf_challenges c ON c.id = s.challenge_id
                WHERE s.student_id = $1
                  AND s.is_correct = true
                  AND c.is_active = true
                GROUP BY c.category
            )
            SELECT a.category
            FROM all_by_category a
            JOIN solved_by_category s ON s.category = a.category
            WHERE s.solved >= a.total`,
            [studentId]
        ),
    ]);

    const hasFirstFlag = Boolean(firstFlagResult.rows[0]?.has_first_flag);
    const hasFirstBlood = Boolean(firstBloodResult.rows[0]?.has_first_blood);
    const solvedCount = parseInt(solvedResult.rows[0]?.solved_count, 10) || 0;
    const totalChallenges = parseInt(totalResult.rows[0]?.total_count, 10) || 0;
    const hasCategoryMaster = (categoryResult.rowCount ?? 0) > 0;

    if (hasFirstFlag && await awardCtfBadge(studentId, 'CTF_FIRST_FLAG')) {
        awardedBadgeTypes.push('CTF_FIRST_FLAG');
    }

    if (hasFirstBlood && await awardCtfBadge(studentId, 'CTF_FIRST_BLOOD')) {
        awardedBadgeTypes.push('CTF_FIRST_BLOOD');
    }

    if (solvedCount >= 10 && await awardCtfBadge(studentId, 'CTF_HACKER')) {
        awardedBadgeTypes.push('CTF_HACKER');
    }

    if (totalChallenges > 0 && solvedCount >= totalChallenges && await awardCtfBadge(studentId, 'CTF_MASTER')) {
        awardedBadgeTypes.push('CTF_MASTER');
    }

    if (hasCategoryMaster && await awardCtfBadge(studentId, 'CTF_CATEGORY_MASTER')) {
        awardedBadgeTypes.push('CTF_CATEGORY_MASTER');
    }

    return awardedBadgeTypes;
}

/* ------------------------------------------------------------------ */
/*  QUIZ BADGE AWARDS                                                  */
/* ------------------------------------------------------------------ */
export async function awardQuizBadges(studentId: string, quizId: string, passed: boolean, percentage: number): Promise<string[]> {
    if (!passed) return [];

    const awarded: string[] = [];

    try {
        // QUIZ_FIRST_PASS — first quiz ever passed
        const firstPassResult = await query(
            `SELECT COUNT(*)::INTEGER AS cnt
             FROM learning.cursus_quiz_results
             WHERE student_id = $1 AND passed = true`,
            [studentId]
        );
        const totalPassed = parseInt(firstPassResult.rows[0]?.cnt, 10) || 0;
        if (totalPassed <= 1) {
            if (await awardCtfBadge(studentId, 'QUIZ_FIRST_PASS')) {
                awarded.push('QUIZ_FIRST_PASS');
            }
        }

        // QUIZ_PERFECT — 100% score
        if (percentage >= 100) {
            if (await awardCtfBadge(studentId, 'QUIZ_PERFECT')) {
                awarded.push('QUIZ_PERFECT');
            }
        }

        // QUIZ_ALL_PASSED — all quizzes in the same cursus passed
        const cursusIdResult = await query(
            `SELECT cursus_id FROM learning.cursus_quizzes WHERE id = $1 LIMIT 1`,
            [quizId]
        );
        const cursusId = cursusIdResult.rows[0]?.cursus_id;
        if (cursusId) {
            const allQuizzesResult = await query(
                `SELECT q.id,
                        EXISTS (
                            SELECT 1 FROM learning.cursus_quiz_results r
                            WHERE r.quiz_id = q.id AND r.student_id = $2 AND r.passed = true
                        ) AS has_passed
                 FROM learning.cursus_quizzes q
                 WHERE q.cursus_id = $1`,
                [cursusId, studentId]
            );
            const allPassed = allQuizzesResult.rows.every((r: any) => r.has_passed);
            if (allPassed && allQuizzesResult.rows.length > 0) {
                if (await awardCtfBadge(studentId, 'QUIZ_ALL_PASSED')) {
                    awarded.push('QUIZ_ALL_PASSED');
                }
            }
        }
    } catch (error: any) {
        logger.error('Failed to award quiz badges', { studentId, quizId, error: error.message });
    }

    return awarded;
}
