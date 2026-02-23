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

function normalizePaymentStatus(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'PAID_CONFIRMED' || normalized === 'REFUNDED' || normalized === 'WAITLIST') {
    return normalized;
  }
  return 'CANDIDATE';
}

function normalizeBooleanCell(value, fallback = false) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return 'true';
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return 'false';
  }
  return fallback ? 'true' : 'false';
}

async function loadExistingRows(outputPath) {
  try {
    const raw = await fs.readFile(outputPath, 'utf8');
    const parsed = parseCsv(raw);
    return parsed.rows
      .map((row) => ({
        student_id: String(row.student_id || '').trim(),
        payment_status: normalizePaymentStatus(row.payment_status),
        invoice_id: String(row.invoice_id || '').trim(),
        signed_terms: normalizeBooleanCell(row.signed_terms, false),
        joined_at: String(row.joined_at || '').trim(),
        notes: String(row.notes || '').trim(),
      }))
      .filter((row) => row.student_id.length > 0);
  } catch {
    return [];
  }
}

async function main() {
  const outputPath = path.join(repoRoot, 'docs/business/cohort1-enrollment-tracker.csv');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const existingRows = await loadExistingRows(outputPath);
  const existingById = new Map(existingRows.map((row) => [row.student_id, row]));

  const result = await pool.query(
    `SELECT id, username, email, first_name, last_name, created_at
     FROM users.users
     WHERE role = 'ROLE_ETUDIANT'
       AND status = 'ACTIVE'
     ORDER BY created_at DESC
     LIMIT 500`
  );

  const dbRows = result.rows || [];
  const studentsById = new Map(dbRows.map((row) => [row.id, row]));
  const preservedRows = existingRows.filter((row) => studentsById.has(row.student_id));
  const selectedIds = new Set(preservedRows.map((row) => row.student_id));

  for (const student of dbRows) {
    if (selectedIds.size >= 30) {
      break;
    }
    if (!selectedIds.has(student.id)) {
      selectedIds.add(student.id);
    }
  }

  const selectedIdList = [
    ...preservedRows.map((row) => row.student_id),
    ...Array.from(selectedIds).filter((id) => !preservedRows.some((row) => row.student_id === id)),
  ].slice(0, 30);

  const now = new Date().toISOString();
  const rows = selectedIdList
    .map((studentId) => {
      const dbStudent = studentsById.get(studentId);
      if (!dbStudent) {
        return null;
      }
      const previous = existingById.get(studentId);
      const fullName = `${dbStudent.first_name || ''} ${dbStudent.last_name || ''}`.trim();
      return {
        studentId: dbStudent.id,
        username: dbStudent.username,
        email: dbStudent.email,
        fullName,
        paymentStatus: previous?.payment_status || 'CANDIDATE',
        invoiceId: previous?.invoice_id || '',
        signedTerms: previous?.signed_terms || 'false',
        joinedAt: previous?.joined_at || '',
        notes: previous?.notes || `seeded_from_users_at_${now}`,
      };
    })
    .filter(Boolean);

  const lines = [
    csvLine(['slot', 'student_id', 'username', 'email', 'full_name', 'payment_status', 'invoice_id', 'signed_terms', 'joined_at', 'notes']),
    ...rows.map((row, index) => csvLine([
      index + 1,
      row.studentId,
      row.username,
      row.email,
      row.fullName,
      row.paymentStatus,
      row.invoiceId,
      row.signedTerms,
      row.joinedAt,
      row.notes,
    ])),
  ];

  await fs.writeFile(outputPath, `${lines.join('\n')}\n`, 'utf8');
  const paidCount = rows.filter((row) => row.paymentStatus === 'PAID_CONFIRMED').length;
  console.log(JSON.stringify({ outputPath, count: rows.length, paidConfirmed: paidCount }, null, 2));
}

main()
  .catch((error) => {
    console.error('[P4 Cohort Tracker] Failed', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
