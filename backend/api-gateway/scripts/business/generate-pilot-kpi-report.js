#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('node:fs/promises');
const path = require('node:path');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const { parseCsv, csvLine } = require('./_csv');

const repoRoot = path.resolve(__dirname, '../../../../');
dotenv.config({ path: path.join(repoRoot, '.env') });

function resolveConnectionString() {
  const raw = process.env.DATABASE_URL;
  if (raw && !raw.includes('${')) {
    return raw;
  }

  const user = process.env.POSTGRES_USER || 'pmp_user';
  const password = process.env.POSTGRES_PASSWORD || 'pmp_secure_pass_2024';
  const db = process.env.POSTGRES_DB || 'pmp_db';
  const host = process.env.POSTGRES_HOST || 'localhost';
  const port = process.env.POSTGRES_PORT || '5435';
  return `postgresql://${user}:${password}@${host}:${port}/${db}`;
}

const connectionString = resolveConnectionString();
const pool = new Pool({ connectionString });

function toPct(num, den) {
  if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return 0;
  return Math.round((num / den) * 10000) / 100;
}

function formatDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown-date';
  return date.toISOString().slice(0, 10);
}

async function loadCohortIds(csvPath) {
  try {
    const raw = await fs.readFile(csvPath, 'utf8');
    const parsed = parseCsv(raw);
    if (!Array.isArray(parsed.rows) || parsed.rows.length === 0) {
      return [];
    }

    const ids = [];
    for (const row of parsed.rows) {
      const id = String(row.student_id || '').trim();
      const status = String(row.payment_status || '').trim().toUpperCase();
      if (!id) continue;
      if (status && status !== 'PAID_CONFIRMED') continue;
      ids.push(id);
    }

    return ids;
  } catch {
    return [];
  }
}

async function querySummary(studentIds) {
  const useFilter = Array.isArray(studentIds) && studentIds.length > 0;

  const params = [];
  let whereScoped = "u.role = 'ROLE_ETUDIANT'";
  if (useFilter) {
    params.push(studentIds);
    whereScoped += ' AND u.id = ANY($1::uuid[])';
  }

  const scopedStudentsResult = await pool.query(
    `SELECT u.id, u.username, u.first_name, u.last_name
     FROM users.users u
     WHERE ${whereScoped}`,
    params
  );
  const scopedStudents = scopedStudentsResult.rows;

  const scopedIds = scopedStudents.map((row) => row.id);
  if (scopedIds.length === 0) {
    return {
      summary: {
        totalStudents: 0,
        startedStudents: 0,
        completedStudents: 0,
        completionRate: 0,
        totalAttempts: 0,
        successfulAttempts: 0,
        successRate: 0,
        averageCompletionMinutes: 0,
      },
      challengeRows: [],
      generatedAt: new Date().toISOString(),
    };
  }

  const scopedParam = [scopedIds];
  const axisColumnCheck = await pool.query(
    `SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'learning'
          AND table_name = 'ctf_submissions'
          AND column_name = 'axis_total_score'
    ) AS has_axis_columns`
  );
  const hasAxisColumns = Boolean(axisColumnCheck.rows[0]?.has_axis_columns);
  const axisSelect = hasAxisColumns
    ? `COALESCE(ROUND(AVG(s.axis_total_score) FILTER (WHERE s.is_correct = true), 2), 0) AS avg_axis_score`
    : '0::NUMERIC AS avg_axis_score';

  const [studentProgress, attemptStats, avgTime, challengeRows] = await Promise.all([
    pool.query(
      `SELECT
          COUNT(DISTINCT p.student_id)::INTEGER AS started_students,
          COUNT(DISTINCT CASE WHEN p.status = 'COMPLETED' THEN p.student_id END)::INTEGER AS completed_students
       FROM learning.ctf_student_progress p
       WHERE p.student_id = ANY($1::uuid[])
         AND p.started_at IS NOT NULL`,
      scopedParam
    ),
    pool.query(
      `SELECT
          COUNT(*)::INTEGER AS total_attempts,
          COUNT(*) FILTER (WHERE is_correct = true)::INTEGER AS successful_attempts
       FROM learning.ctf_submissions
       WHERE student_id = ANY($1::uuid[])`,
      scopedParam
    ),
    pool.query(
      `SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (p.completed_at - p.started_at)) / 60), 2), 0) AS avg_completion_minutes
       FROM learning.ctf_student_progress p
       WHERE p.student_id = ANY($1::uuid[])
         AND p.started_at IS NOT NULL
         AND p.completed_at IS NOT NULL`,
      scopedParam
    ),
    pool.query(
      `SELECT
          c.challenge_code,
          c.title,
          COUNT(DISTINCT p.student_id)::INTEGER AS started_count,
          COUNT(DISTINCT CASE WHEN p.status = 'COMPLETED' THEN p.student_id END)::INTEGER AS completed_count,
          COUNT(s.id)::INTEGER AS attempt_count,
          COUNT(*) FILTER (WHERE s.is_correct = true)::INTEGER AS success_count,
          ${axisSelect},
          COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (p.completed_at - p.started_at)) / 60) FILTER (WHERE p.completed_at IS NOT NULL AND p.started_at IS NOT NULL), 2), 0) AS avg_completion_minutes
       FROM learning.ctf_challenges c
       LEFT JOIN learning.ctf_student_progress p
         ON p.challenge_id = c.id
        AND p.student_id = ANY($1::uuid[])
       LEFT JOIN learning.ctf_submissions s
         ON s.challenge_id = c.id
        AND s.student_id = ANY($1::uuid[])
       WHERE c.is_active = true
       GROUP BY c.challenge_code, c.title
       ORDER BY c.challenge_code ASC`,
      scopedParam
    ),
  ]);

  const totalStudents = scopedStudents.length;
  const startedStudents = Number(studentProgress.rows[0]?.started_students || 0);
  const completedStudents = Number(studentProgress.rows[0]?.completed_students || 0);
  const totalAttempts = Number(attemptStats.rows[0]?.total_attempts || 0);
  const successfulAttempts = Number(attemptStats.rows[0]?.successful_attempts || 0);
  const averageCompletionMinutes = Number(avgTime.rows[0]?.avg_completion_minutes || 0);

  const normalizedChallengeRows = challengeRows.rows.map((row) => {
    const startedCount = Number(row.started_count || 0);
    const completedCount = Number(row.completed_count || 0);
    const attemptCount = Number(row.attempt_count || 0);
    const successCount = Number(row.success_count || 0);

    return {
      challengeCode: row.challenge_code,
      title: row.title,
      startedCount,
      completedCount,
      attemptCount,
      successCount,
      completionRate: toPct(completedCount, startedCount),
      successRate: toPct(successCount, attemptCount),
      dropoffRate: startedCount > 0 ? Math.round(((startedCount - completedCount) / startedCount) * 10000) / 100 : 0,
      avgAxisScore: Number(row.avg_axis_score || 0),
      averageCompletionMinutes: Number(row.avg_completion_minutes || 0),
    };
  });

  return {
    summary: {
      totalStudents,
      startedStudents,
      completedStudents,
      completionRate: toPct(completedStudents, totalStudents),
      totalAttempts,
      successfulAttempts,
      successRate: toPct(successfulAttempts, totalAttempts),
      averageCompletionMinutes,
    },
    challengeRows: normalizedChallengeRows,
    generatedAt: new Date().toISOString(),
  };
}

async function writeOutputs(result, outputDir) {
  await fs.mkdir(outputDir, { recursive: true });

  const dateKey = formatDateKey(result.generatedAt);
  const mdPath = path.join(outputDir, `cohort1-kpi-${dateKey}.md`);
  const csvPath = path.join(outputDir, `cohort1-kpi-${dateKey}.csv`);

  const summary = result.summary;
  const markdown = [
    '# Cohort 1 KPI report',
    '',
    `Generated at: ${result.generatedAt}`,
    '',
    '## Global KPIs',
    `- Total students in scope: ${summary.totalStudents}`,
    `- Started students: ${summary.startedStudents}`,
    `- Completed students: ${summary.completedStudents}`,
    `- Completion rate: ${summary.completionRate}%`,
    `- Total attempts: ${summary.totalAttempts}`,
    `- Successful attempts: ${summary.successfulAttempts}`,
    `- Success rate: ${summary.successRate}%`,
    `- Average completion time: ${summary.averageCompletionMinutes} min`,
    '',
    '## Challenge KPIs',
    '| Challenge | Started | Completed | Completion % | Attempts | Successes | Success % | Drop-off % | Avg Axis | Avg Time (min) |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
    ...result.challengeRows.map((row) => `| ${row.challengeCode} | ${row.startedCount} | ${row.completedCount} | ${row.completionRate} | ${row.attemptCount} | ${row.successCount} | ${row.successRate} | ${row.dropoffRate} | ${row.avgAxisScore} | ${row.averageCompletionMinutes} |`),
    '',
  ].join('\n');

  const csvLines = [
    csvLine(['challenge_code', 'title', 'started_count', 'completed_count', 'completion_rate', 'attempt_count', 'success_count', 'success_rate', 'dropoff_rate', 'avg_axis_score', 'avg_completion_minutes']),
    ...result.challengeRows.map((row) => csvLine([
      row.challengeCode,
      row.title,
      row.startedCount,
      row.completedCount,
      row.completionRate,
      row.attemptCount,
      row.successCount,
      row.successRate,
      row.dropoffRate,
      row.avgAxisScore,
      row.averageCompletionMinutes,
    ])),
  ].join('\n');

  await fs.writeFile(mdPath, markdown, 'utf8');
  await fs.writeFile(csvPath, csvLines, 'utf8');

  return { mdPath, csvPath, dateKey };
}

async function appendHistory(summary, dateKey, historyPath) {
  let existing = '';
  try {
    existing = await fs.readFile(historyPath, 'utf8');
  } catch {
    existing = '';
  }

  const header = csvLine([
    'date',
    'total_students',
    'started_students',
    'completed_students',
    'completion_rate',
    'total_attempts',
    'successful_attempts',
    'success_rate',
    'average_completion_minutes',
  ]);
  const record = csvLine([
    dateKey,
    summary.totalStudents,
    summary.startedStudents,
    summary.completedStudents,
    summary.completionRate,
    summary.totalAttempts,
    summary.successfulAttempts,
    summary.successRate,
    summary.averageCompletionMinutes,
  ]);

  const trimmed = existing.trim();
  const lines = trimmed ? trimmed.split(/\r?\n/).filter(Boolean) : [];
  const hasHeader = lines[0] === header;
  const body = hasHeader ? lines.slice(1) : lines;
  const withoutCurrentDate = body.filter((line) => line.split(',')[0] !== dateKey);
  const nextContent = [header, ...withoutCurrentDate, record].join('\n');

  await fs.writeFile(historyPath, `${nextContent}\n`, 'utf8');
}

async function main() {
  const args = process.argv.slice(2);
  const cohortArgIndex = args.indexOf('--cohort-file');
  const cohortFile = cohortArgIndex >= 0 && args[cohortArgIndex + 1]
    ? path.resolve(process.cwd(), args[cohortArgIndex + 1])
    : path.join(repoRoot, 'docs/business/cohort1-enrollment-tracker.csv');

  const outputArgIndex = args.indexOf('--output-dir');
  const outputDir = outputArgIndex >= 0 && args[outputArgIndex + 1]
    ? path.resolve(process.cwd(), args[outputArgIndex + 1])
    : path.join(repoRoot, 'docs/business/reports');

  const cohortIds = await loadCohortIds(cohortFile);
  const result = await querySummary(cohortIds);
  const outputs = await writeOutputs(result, outputDir);
  const historyPath = path.join(outputDir, 'cohort1-kpi-history.csv');
  await appendHistory(result.summary, outputs.dateKey, historyPath);

  console.log(JSON.stringify({
    cohortFile,
    paidStudentsInScope: cohortIds.length,
    generatedAt: result.generatedAt,
    summary: result.summary,
    historyPath,
    outputs,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error('[P4 KPI] Failed', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
