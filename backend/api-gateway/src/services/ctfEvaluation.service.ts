import crypto from 'node:crypto';
import { query } from '../config/database';
import { logger } from '../utils/logger';

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
};

function normalizeFlag(value: string): string {
    return value.trim().toUpperCase();
}

export function validateFlag(submitted: string, expected: string): boolean {
    if (!submitted || !expected) {
        return false;
    }

    const submittedHash = crypto.createHash('sha256').update(normalizeFlag(submitted)).digest();
    const expectedHash = crypto.createHash('sha256').update(normalizeFlag(expected)).digest();

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
