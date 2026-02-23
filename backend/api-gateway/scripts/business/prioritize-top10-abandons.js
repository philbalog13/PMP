#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('node:fs/promises');
const path = require('node:path');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const { csvLine } = require('./_csv');

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

function recommendation(row) {
  const recos = [];
  if (Number(row.started_count) < 3) {
    recos.push('Increase learner exposure: assign this challenge earlier and add mentor demo replay.');
  }
  if (Number(row.dropoff_rate) >= 60) {
    recos.push('Reduce initial friction: add mission brief checkpoints and first-step scaffolding.');
  }
  if (Number(row.avg_axis_score) < 70) {
    recos.push('Improve proof/patch guidance and add clearer evidence examples.');
  }
  if (Number(row.debrief_coverage_rate) < 50) {
    recos.push('Enforce debrief completion with tighter UI nudges and mentor follow-up.');
  }
  if (recos.length === 0) {
    recos.push('Tune hints and guided steps based on blocked step telemetry.');
  }
  return recos.join(' ');
}

async function main() {
  const outputDir = path.join(repoRoot, 'docs/business');
  await fs.mkdir(outputDir, { recursive: true });

  const analytics = await pool.query(
    `SELECT
        c.challenge_code,
        c.title,
        c.category,
        COUNT(DISTINCT p.student_id)::INTEGER AS started_count,
        COUNT(DISTINCT CASE WHEN p.status = 'COMPLETED' THEN p.student_id END)::INTEGER AS completed_count,
        CASE
            WHEN COUNT(DISTINCT p.student_id) = 0 THEN 0
            ELSE ROUND(
                (
                    (COUNT(DISTINCT p.student_id) - COUNT(DISTINCT CASE WHEN p.status = 'COMPLETED' THEN p.student_id END))::NUMERIC
                    / COUNT(DISTINCT p.student_id)
                ) * 100,
                2
            )
        END AS dropoff_rate,
        COALESCE(ROUND(AVG(s.axis_total_score) FILTER (WHERE s.is_correct = true), 2), 0) AS avg_axis_score,
        CASE
            WHEN COUNT(DISTINCT CASE WHEN p.status = 'COMPLETED' THEN p.student_id END) = 0 THEN 0
            ELSE ROUND(
                (
                    COUNT(DISTINCT d.student_id)::NUMERIC
                    / COUNT(DISTINCT CASE WHEN p.status = 'COMPLETED' THEN p.student_id END)
                ) * 100,
                2
            )
        END AS debrief_coverage_rate
     FROM learning.ctf_challenges c
     LEFT JOIN learning.ctf_student_progress p ON p.challenge_id = c.id
     LEFT JOIN learning.ctf_submissions s ON s.challenge_id = c.id
     LEFT JOIN learning.ctf_debriefs d ON d.challenge_id = c.id
     WHERE c.is_active = true
     GROUP BY c.challenge_code, c.title, c.category`
  );

  const rows = analytics.rows
    .map((row) => {
      const startedCount = Number(row.started_count || 0);
      const dropoffRate = Number(row.dropoff_rate || 0);
      const avgAxisScore = Number(row.avg_axis_score || 0);
      const debriefCoverageRate = Number(row.debrief_coverage_rate || 0);
      const impactScore = Number((
        (dropoffRate * Math.max(startedCount, 1))
        + ((100 - avgAxisScore) * 0.2)
        + ((100 - debriefCoverageRate) * 0.1)
      ).toFixed(2));

      return {
        challengeCode: row.challenge_code,
        title: row.title,
        category: row.category,
        startedCount,
        completedCount: Number(row.completed_count || 0),
        dropoffRate,
        avgAxisScore,
        debriefCoverageRate,
        impactScore,
        recommendation: recommendation(row),
      };
    })
    .sort((a, b) => {
      if (b.impactScore !== a.impactScore) {
        return b.impactScore - a.impactScore;
      }
      if (b.dropoffRate !== a.dropoffRate) {
        return b.dropoffRate - a.dropoffRate;
      }
      return b.startedCount - a.startedCount;
    })
    .slice(0, 10)
    .map((row, index) => ({
      rank: index + 1,
      ...row,
    }));

  const finalizedRows = rows.map((row) => ({
    rank: row.rank,
    challengeCode: row.challengeCode,
    title: row.title,
    category: row.category,
    startedCount: row.startedCount,
    completedCount: row.completedCount,
    dropoffRate: row.dropoffRate,
    avgAxisScore: row.avgAxisScore,
    debriefCoverageRate: row.debriefCoverageRate,
    impactScore: row.impactScore,
    recommendation: row.recommendation,
  }));

  const csvPath = path.join(outputDir, 'top10-abandons.csv');
  const mdPath = path.join(outputDir, 'top10-abandons-backlog.md');

  const csv = [
    csvLine(['rank', 'challenge_code', 'title', 'category', 'started_count', 'completed_count', 'dropoff_rate', 'avg_axis_score', 'debrief_coverage_rate', 'impact_score', 'recommendation']),
    ...finalizedRows.map((row) => csvLine([
      row.rank,
      row.challengeCode,
      row.title,
      row.category,
      row.startedCount,
      row.completedCount,
      row.dropoffRate,
      row.avgAxisScore,
      row.debriefCoverageRate,
      row.impactScore,
      row.recommendation,
    ])),
  ].join('\n');

  const markdown = [
    '# Top 10 challenges les plus abandonnes',
    '',
    `Generated at: ${new Date().toISOString()}`,
    '',
    '| Rank | Challenge | Category | Started | Completed | Drop-off % | Avg Axis | Debrief % | Impact | Recommendation |',
    '|---:|---|---|---:|---:|---:|---:|---:|---:|---|',
    ...finalizedRows.map((row) => `| ${row.rank} | ${row.challengeCode} - ${row.title} | ${row.category} | ${row.startedCount} | ${row.completedCount} | ${row.dropoffRate} | ${row.avgAxisScore} | ${row.debriefCoverageRate} | ${row.impactScore} | ${row.recommendation} |`),
    '',
    '## Sprint corrective propose (P4-07 prep)',
    '',
    ...finalizedRows.map((row) => `- [ ] ${row.challengeCode}: ${row.recommendation}`),
    '',
  ].join('\n');

  await fs.writeFile(csvPath, csv, 'utf8');
  await fs.writeFile(mdPath, markdown, 'utf8');

  console.log(JSON.stringify({ count: finalizedRows.length, csvPath, mdPath }, null, 2));
}

main()
  .catch((error) => {
    console.error('[P4 Top10] Failed', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
