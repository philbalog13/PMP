#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('node:fs/promises');
const path = require('node:path');
const { parseCsv, csvLine } = require('./_csv');

const repoRoot = path.resolve(__dirname, '../../../../');

function toPct(num, den) {
  if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return 0;
  return Math.round((num / den) * 10000) / 100;
}

function formatDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown-date';
  return date.toISOString().slice(0, 10);
}

function parseArgs(args) {
  const cohortIndex = args.indexOf('--cohort-file');
  const surveyIndex = args.indexOf('--survey-file');
  const outputIndex = args.indexOf('--output-file');

  return {
    cohortFile: cohortIndex >= 0 && args[cohortIndex + 1]
      ? path.resolve(process.cwd(), args[cohortIndex + 1])
      : path.join(repoRoot, 'docs/business/cohort1-enrollment-tracker.csv'),
    surveyFile: surveyIndex >= 0 && args[surveyIndex + 1]
      ? path.resolve(process.cwd(), args[surveyIndex + 1])
      : path.join(repoRoot, 'docs/business/cohort1-satisfaction-survey.csv'),
    outputFile: outputIndex >= 0 && args[outputIndex + 1]
      ? path.resolve(process.cwd(), args[outputIndex + 1])
      : path.join(repoRoot, 'docs/business/cohort1-satisfaction-report.md'),
  };
}

function isTruthy(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'y';
}

function parseScore(value, min, max) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < min || parsed > max) return null;
  return parsed;
}

function bucketThemes(rows, key) {
  const top = [];
  for (const row of rows) {
    const value = String(row[key] || '').trim();
    if (value) {
      top.push(value);
    }
    if (top.length >= 5) {
      break;
    }
  }
  return top;
}

async function ensureSurveyTemplate(surveyFile, paidRows) {
  try {
    await fs.access(surveyFile);
    return false;
  } catch {
    await fs.mkdir(path.dirname(surveyFile), { recursive: true });
    const header = [
      'response_id',
      'student_id',
      'nps',
      'csat',
      'refund_requested',
      'what_helped',
      'biggest_blocker',
      'change_first',
      'created_at',
    ];

    const lines = [
      csvLine(header),
      ...paidRows.map((row, index) => csvLine([
        `R-${String(index + 1).padStart(3, '0')}`,
        row.student_id,
        '',
        '',
        'false',
        '',
        '',
        '',
        '',
      ])),
    ];

    await fs.writeFile(surveyFile, `${lines.join('\n')}\n`, 'utf8');
    return true;
  }
}

async function main() {
  const { cohortFile, surveyFile, outputFile } = parseArgs(process.argv.slice(2));
  const generatedAt = new Date().toISOString();

  const cohortRaw = await fs.readFile(cohortFile, 'utf8');
  const cohortParsed = parseCsv(cohortRaw);
  const paidRows = cohortParsed.rows.filter((row) => String(row.payment_status || '').toUpperCase() === 'PAID_CONFIRMED');
  const paidIds = new Set(paidRows.map((row) => String(row.student_id || '').trim()).filter(Boolean));

  const templateCreated = await ensureSurveyTemplate(surveyFile, paidRows);
  const surveyRaw = await fs.readFile(surveyFile, 'utf8');
  const surveyParsed = parseCsv(surveyRaw);

  const scopedResponses = surveyParsed.rows.filter((row) => paidIds.has(String(row.student_id || '').trim()));
  const validResponses = scopedResponses.filter((row) => parseScore(row.nps, 0, 10) !== null || parseScore(row.csat, 1, 5) !== null);

  const npsScores = validResponses
    .map((row) => parseScore(row.nps, 0, 10))
    .filter((value) => value !== null);
  const csatScores = validResponses
    .map((row) => parseScore(row.csat, 1, 5))
    .filter((value) => value !== null);

  const promoters = npsScores.filter((score) => score >= 9).length;
  const passives = npsScores.filter((score) => score >= 7 && score <= 8).length;
  const detractors = npsScores.filter((score) => score <= 6).length;
  const nps = npsScores.length > 0
    ? Math.round(((promoters / npsScores.length) * 100 - (detractors / npsScores.length) * 100) * 100) / 100
    : 0;

  const csatSatisfied = csatScores.filter((score) => score >= 4).length;
  const csatRate = toPct(csatSatisfied, csatScores.length);

  const refundRequested = scopedResponses.filter((row) => isTruthy(row.refund_requested)).length;
  const refundRate = toPct(refundRequested, paidRows.length);

  const helpedThemes = bucketThemes(scopedResponses, 'what_helped');
  const blockerThemes = bucketThemes(scopedResponses, 'biggest_blocker');
  const changeThemes = bucketThemes(scopedResponses, 'change_first');

  const report = [
    '# Cohorte 1 - Satisfaction report',
    '',
    `Generated at: ${generatedAt}`,
    '',
    '## Coverage',
    `- Paid students: ${paidRows.length}`,
    `- Responses in scope: ${scopedResponses.length}`,
    `- Responses with quantitative fields: ${validResponses.length}`,
    `- Survey template created this run: ${templateCreated ? 'yes' : 'no'}`,
    '',
    '## KPIs',
    `- NPS: ${nps}`,
    `- NPS distribution (P/Pa/D): ${promoters}/${passives}/${detractors}`,
    `- CSAT (4-5): ${csatRate}%`,
    `- Refund requested: ${refundRequested}`,
    `- Refund rate: ${refundRate}%`,
    '',
    '## Qualitative themes (anonymized)',
    '- What helped most:',
    ...(helpedThemes.length > 0 ? helpedThemes.map((item) => `  - ${item}`) : ['  - No response yet']),
    '- Biggest blocker:',
    ...(blockerThemes.length > 0 ? blockerThemes.map((item) => `  - ${item}`) : ['  - No response yet']),
    '- Change first:',
    ...(changeThemes.length > 0 ? changeThemes.map((item) => `  - ${item}`) : ['  - No response yet']),
    '',
    '## Notes',
    '- This report only aggregates students marked `PAID_CONFIRMED` in the cohort tracker.',
    '- Fill `docs/business/cohort1-satisfaction-survey.csv` to refresh metrics daily.',
    '',
  ].join('\n');

  await fs.mkdir(path.dirname(outputFile), { recursive: true });
  await fs.writeFile(outputFile, report, 'utf8');

  const summaryCsvPath = path.join(path.dirname(outputFile), `cohort1-satisfaction-summary-${formatDateKey(generatedAt)}.csv`);
  const summaryCsv = [
    csvLine(['date', 'paid_students', 'responses_in_scope', 'quant_responses', 'nps', 'csat_rate', 'refund_requested', 'refund_rate']),
    csvLine([formatDateKey(generatedAt), paidRows.length, scopedResponses.length, validResponses.length, nps, csatRate, refundRequested, refundRate]),
  ].join('\n');
  await fs.writeFile(summaryCsvPath, `${summaryCsv}\n`, 'utf8');

  console.log(JSON.stringify({
    cohortFile,
    surveyFile,
    outputFile,
    summaryCsvPath,
    paidStudents: paidRows.length,
    responses: scopedResponses.length,
    nps,
    csatRate,
    refundRate,
    templateCreated,
  }, null, 2));
}

main().catch((error) => {
  console.error('[P4 Satisfaction] Failed', error.message);
  process.exitCode = 1;
});
