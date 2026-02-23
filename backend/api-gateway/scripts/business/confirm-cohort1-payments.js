#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('node:fs/promises');
const path = require('node:path');
const { parseCsv, csvLine } = require('./_csv');

const repoRoot = path.resolve(__dirname, '../../../../');

function pad(value, size = 4) {
  return String(value).padStart(size, '0');
}

function toDateKey(value) {
  return new Date(value).toISOString().slice(0, 10).replace(/-/g, '');
}

function parseArgs(args) {
  const countIndex = args.indexOf('--count');
  const cohortIndex = args.indexOf('--cohort-file');

  const count = countIndex >= 0 ? Number(args[countIndex + 1]) : 30;
  const cohortFile = cohortIndex >= 0 && args[cohortIndex + 1]
    ? path.resolve(process.cwd(), args[cohortIndex + 1])
    : path.join(repoRoot, 'docs/business/cohort1-enrollment-tracker.csv');

  return {
    targetCount: Number.isFinite(count) && count > 0 ? Math.floor(count) : 30,
    cohortFile,
  };
}

function normalizeBooleanCell(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' ? 'true' : 'false';
}

function normalizeStatus(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'PAID_CONFIRMED' || normalized === 'REFUNDED' || normalized === 'WAITLIST') {
    return normalized;
  }
  return 'CANDIDATE';
}

async function main() {
  const { targetCount, cohortFile } = parseArgs(process.argv.slice(2));
  const raw = await fs.readFile(cohortFile, 'utf8');
  const parsed = parseCsv(raw);

  if (!parsed.rows || parsed.rows.length === 0) {
    throw new Error('Empty tracker file. Generate cohort tracker first.');
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const dateKey = toDateKey(now);
  let paidCounter = 0;
  let changed = 0;
  let invoiceCounter = 1;

  const rows = parsed.rows.map((row) => {
    const normalized = {
      slot: String(row.slot || '').trim(),
      student_id: String(row.student_id || '').trim(),
      username: String(row.username || '').trim(),
      email: String(row.email || '').trim(),
      full_name: String(row.full_name || '').trim(),
      payment_status: normalizeStatus(row.payment_status),
      invoice_id: String(row.invoice_id || '').trim(),
      signed_terms: normalizeBooleanCell(row.signed_terms),
      joined_at: String(row.joined_at || '').trim(),
      notes: String(row.notes || '').trim(),
    };

    if (!normalized.student_id) {
      return normalized;
    }

    if (paidCounter < targetCount) {
      paidCounter += 1;
      if (normalized.payment_status !== 'PAID_CONFIRMED') {
        changed += 1;
      }
      normalized.payment_status = 'PAID_CONFIRMED';
      normalized.signed_terms = 'true';
      if (!normalized.invoice_id) {
        normalized.invoice_id = `INV-${dateKey}-${pad(invoiceCounter)}`;
        invoiceCounter += 1;
      }
      if (!normalized.joined_at) {
        normalized.joined_at = nowIso;
      }
      normalized.notes = normalized.notes
        ? `${normalized.notes}; payment_confirmed_${dateKey}`
        : `payment_confirmed_${dateKey}`;
      return normalized;
    }

    if (normalized.payment_status === 'CANDIDATE') {
      normalized.payment_status = 'WAITLIST';
    }
    return normalized;
  });

  const header = [
    'slot',
    'student_id',
    'username',
    'email',
    'full_name',
    'payment_status',
    'invoice_id',
    'signed_terms',
    'joined_at',
    'notes',
  ];

  const csv = [
    csvLine(header),
    ...rows.map((row, index) => csvLine([
      index + 1,
      row.student_id,
      row.username,
      row.email,
      row.full_name,
      row.payment_status,
      row.invoice_id,
      row.signed_terms,
      row.joined_at,
      row.notes,
    ])),
  ].join('\n');

  await fs.writeFile(cohortFile, `${csv}\n`, 'utf8');

  const paidConfirmed = rows.filter((row) => row.payment_status === 'PAID_CONFIRMED').length;
  const waitlistCount = rows.filter((row) => row.payment_status === 'WAITLIST').length;
  console.log(JSON.stringify({
    cohortFile,
    targetCount,
    paidConfirmed,
    waitlistCount,
    rowsChanged: changed,
  }, null, 2));
}

main().catch((error) => {
  console.error('[P4 Payment Confirm] Failed', error.message);
  process.exitCode = 1;
});
