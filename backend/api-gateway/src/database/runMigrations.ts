import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import { Pool, PoolClient } from 'pg';
import { CTF_CHALLENGES, CTF_TOTAL_ACTIVE_CHALLENGES, CtfChallengeSeed } from '../data/ctfChallenges';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://pmp_user:pmp_secure_pass_2024@localhost:5435/pmp_db';
const pool = new Pool({ connectionString });

function getMigrationOrder(fileName: string): number {
    const match = fileName.match(/^(\d+)_/);
    return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

async function ensureMigrationHistoryTable(): Promise<void> {
    await pool.query('CREATE SCHEMA IF NOT EXISTS learning');
    await pool.query(
        `CREATE TABLE IF NOT EXISTS learning.migration_history (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            file_name VARCHAR(255) NOT NULL UNIQUE,
            executed_at TIMESTAMP NOT NULL DEFAULT NOW()
        )`
    );
}

async function getAlreadyAppliedMigrations(): Promise<Set<string>> {
    const result = await pool.query('SELECT file_name FROM learning.migration_history');
    return new Set(result.rows.map((row) => row.file_name as string));
}

async function executeMigration(fileName: string, sql: string): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO learning.migration_history (file_name) VALUES ($1)', [fileName]);
        await client.query('COMMIT');
        // eslint-disable-next-line no-console
        console.log(`[MIGRATION] Applied ${fileName}`);
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function ctfTablesReady(): Promise<boolean> {
    const result = await pool.query(
        `SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'learning'
              AND table_name = 'ctf_challenges'
        ) AS ctf_ready`
    );

    return Boolean(result.rows[0]?.ctf_ready);
}

async function upsertCtfChallenge(client: PoolClient, challenge: CtfChallengeSeed): Promise<void> {
    const challengeResult = await client.query(
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
            is_active
        )
        VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13::jsonb, $14, $15
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
            challenge.isActive,
        ]
    );

    const challengeId = challengeResult.rows[0]?.id;
    if (!challengeId) {
        return;
    }

    await client.query('DELETE FROM learning.ctf_guided_steps WHERE challenge_id = $1', [challengeId]);
    await client.query('DELETE FROM learning.ctf_hints WHERE challenge_id = $1', [challengeId]);

    for (const step of challenge.guidedSteps) {
        await client.query(
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
        await client.query(
            `INSERT INTO learning.ctf_hints (
                challenge_id,
                hint_number,
                hint_text,
                cost_points
            )
            VALUES ($1, $2, $3, $4)`,
            [challengeId, hint.hintNumber, hint.hintText, hint.costPoints]
        );
    }
}

async function seedCtfChallenges(): Promise<void> {
    const ready = await ctfTablesReady();
    if (!ready) {
        return;
    }

    const countResult = await pool.query('SELECT COUNT(*)::INTEGER AS count FROM learning.ctf_challenges');
    const challengeCount = parseInt(countResult.rows[0]?.count, 10) || 0;

    if (challengeCount >= CTF_TOTAL_ACTIVE_CHALLENGES) {
        // eslint-disable-next-line no-console
        console.log(`[MIGRATION] CTF seed skipped (${challengeCount} challenges already present)`);
        return;
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const challenge of CTF_CHALLENGES) {
            await upsertCtfChallenge(client, challenge);
        }
        await client.query('COMMIT');
        // eslint-disable-next-line no-console
        console.log(`[MIGRATION] Seeded ${CTF_CHALLENGES.length} CTF challenges`);
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function runMigrations(): Promise<void> {
    const migrationsDir = path.join(__dirname, 'migrations');

    await ensureMigrationHistoryTable();

    const files = (await fs.readdir(migrationsDir))
        .filter((file) => file.endsWith('.sql'))
        .sort((a, b) => getMigrationOrder(a) - getMigrationOrder(b) || a.localeCompare(b));

    const applied = await getAlreadyAppliedMigrations();

    for (const fileName of files) {
        if (applied.has(fileName)) {
            // eslint-disable-next-line no-console
            console.log(`[MIGRATION] Skipped ${fileName} (already applied)`);
            continue;
        }

        const sqlPath = path.join(migrationsDir, fileName);
        const sql = await fs.readFile(sqlPath, 'utf8');
        await executeMigration(fileName, sql);
    }

    await seedCtfChallenges();

    // eslint-disable-next-line no-console
    console.log('[MIGRATION] Completed');
}

runMigrations()
    .catch((error) => {
        // eslint-disable-next-line no-console
        console.error('[MIGRATION] Failed', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await pool.end();
    });
