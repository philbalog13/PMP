#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.PMP_BASE_URL || 'http://localhost:8000';
const PROVIDED_STUDENT_ID = (process.env.PMP_STUDENT_ID || '').trim();
const STUDENT_ID = PROVIDED_STUDENT_ID || randomUUID();
const STUDENT_ROLE = process.env.PMP_STUDENT_ROLE || 'ROLE_ETUDIANT';
const CURSUS_ID = process.env.PMP_CURSUS_ID || 'cursus-audit-financier';
const MODULE_ID = process.env.PMP_MODULE_ID || 'mod-1-fondamentaux-comptables-financiers';
const POSTGRES_CONTAINER = process.env.PMP_POSTGRES_CONTAINER || 'pmp-postgres';
const REPORT_JSON_PATH = (process.env.PMP_SMOKE_REPORT_JSON || '').trim();
const STARTED_AT = new Date().toISOString();

const TEST_RESULTS = [];

function logInfo(message) {
  console.log(`[INFO] ${message}`);
}

function logPass(message) {
  TEST_RESULTS.push({ status: 'PASS', message });
  console.log(`[PASS] ${message}`);
}

function logFail(message) {
  TEST_RESULTS.push({ status: 'FAIL', message });
  console.error(`[FAIL] ${message}`);
}

function buildStructuredReport({ fatalError = null } = {}) {
  const passed = TEST_RESULTS.filter((entry) => entry.status === 'PASS').length;
  const failed = TEST_RESULTS.filter((entry) => entry.status === 'FAIL').length;
  return {
    suite: 'ua-ctf-smoke',
    status: failed > 0 || fatalError ? 'FAIL' : 'PASS',
    startedAt: STARTED_AT,
    finishedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    studentId: STUDENT_ID,
    studentRole: STUDENT_ROLE,
    cursusId: CURSUS_ID,
    moduleId: MODULE_ID,
    postgresContainer: POSTGRES_CONTAINER,
    summary: {
      total: TEST_RESULTS.length,
      passed,
      failed,
    },
    fatalError,
    results: TEST_RESULTS,
  };
}

function writeStructuredReport(report) {
  if (!REPORT_JSON_PATH) {
    return;
  }

  mkdirSync(path.dirname(REPORT_JSON_PATH), { recursive: true });
  writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
  logPass(message);
}

async function fetchJson(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { status: response.status, ok: response.ok, json, text };
  } finally {
    clearTimeout(timeout);
  }
}

function sqlEscape(value) {
  return String(value).replace(/'/g, "''");
}

function runSql(sql) {
  const output = execFileSync(
    'docker',
    [
      'exec',
      POSTGRES_CONTAINER,
      'psql',
      '-U',
      'pmp_user',
      '-d',
      'pmp_db',
      '-v',
      'ON_ERROR_STOP=1',
      '-A',
      '-F',
      '|',
      '-t',
      '-c',
      sql,
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );
  return output.toString('utf8').trim();
}

function cleanupStudentState(studentId) {
  const sid = sqlEscape(studentId);
  runSql(`
BEGIN;
UPDATE learning.ctf_lab_sessions
SET status = 'STOPPED',
    terminated_at = COALESCE(terminated_at, NOW()),
    updated_at = NOW()
WHERE student_id = '${sid}'
  AND status IN ('PROVISIONING', 'RUNNING');

UPDATE learning.ctf_lab_instances
SET status = 'STOPPED',
    updated_at = NOW()
WHERE session_id IN (
    SELECT id
    FROM learning.ctf_lab_sessions
    WHERE student_id = '${sid}'
);

DELETE FROM learning.cursus_unit_task_submissions
WHERE progress_id IN (
    SELECT id
    FROM learning.cursus_unit_progress
    WHERE student_id = '${sid}'
);

DELETE FROM learning.cursus_unit_task_progress
WHERE progress_id IN (
    SELECT id
    FROM learning.cursus_unit_progress
    WHERE student_id = '${sid}'
);

DELETE FROM learning.cursus_unit_progress
WHERE student_id = '${sid}';
COMMIT;
`);
}

function ensureStudentExists(studentId) {
  const sid = sqlEscape(studentId);
  const compact = sid.replace(/-/g, '');
  const username = sqlEscape(`ua_e2e_${compact}`.slice(0, 50));
  const email = sqlEscape(`ua_e2e_${compact}@pmp.local`.slice(0, 255));
  // Fake bcrypt-like value; auth token endpoint does not verify password.
  const passwordHash = sqlEscape('$2b$12$abcdefghijklmnopqrstuvabcdefghijklmnopqrstuvabcdef');
  runSql(`
INSERT INTO users.users (id, username, email, password_hash, first_name, last_name, role, status)
VALUES ('${sid}', '${username}', '${email}', '${passwordHash}', 'UA', 'E2E', 'ROLE_ETUDIANT', 'ACTIVE')
ON CONFLICT (id) DO UPDATE
SET username = EXCLUDED.username,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    updated_at = NOW();
`);
}

function inferMode(task) {
  const schemaMode = String(task.answerSchema?.mode || '').trim().toUpperCase();
  if (schemaMode) return schemaMode;
  const type = String(task.taskType || '').trim().toUpperCase();
  if (['READING', 'CHECKLIST', 'RESOURCE'].includes(type)) return 'MARK_DONE';
  if (type === 'QUIZ') return 'QUIZ_SINGLE';
  if (type === 'VALIDATION') return 'FLAG';
  if (type === 'EXERCISE') return 'FREE_TEXT';
  return 'FREE_TEXT';
}

function buildSubmission(task) {
  const mode = inferMode(task);
  const schema = task.answerSchema || {};

  if (mode === 'MARK_DONE') return { done: true };
  if (mode === 'QUIZ_SINGLE') {
    const idx = Number.isInteger(schema.correctOptionIndex) ? schema.correctOptionIndex : 0;
    return { selectedOptionIndex: idx };
  }
  if (mode === 'QUIZ_MULTIPLE') {
    const values = Array.isArray(schema.correctOptionIndexes) ? schema.correctOptionIndexes : [0];
    return { selectedOptionIndexes: values.map((v) => Number(v)).filter((v) => Number.isFinite(v)) };
  }
  if (mode === 'KEYWORDS') {
    const keywords = Array.isArray(schema.keywords) && schema.keywords.length > 0
      ? schema.keywords.map((k) => String(k))
      : ['controle', 'preuve', 'reconnaissance'];
    return { answer: keywords.join(' ') };
  }
  if (mode === 'FLAG') {
    if (schema.expectedFlag) return { flag: String(schema.expectedFlag) };
    if (schema.expected) return { flag: String(schema.expected) };
    return { flag: 'PMP{DUMMY_FLAG}' };
  }
  if (mode === 'EXACT') {
    const expected = schema.expectedAnswer ?? schema.expected ?? schema.value ?? 'ok';
    return { answer: String(expected) };
  }
  if (mode === 'REGEX') {
    return { answer: 'validation-text' };
  }
  return { answer: 'controle preuve reconnaissance' };
}

function getSessionId(session) {
  if (!session || typeof session !== 'object') return '';
  return String(session.sessionId || session.id || '').trim();
}

async function expectError(path, { method = 'POST', token, body, expectedStatus, expectedCode }) {
  const response = await fetchJson(path, { method, token, body });
  assert(response.status === expectedStatus, `HTTP ${expectedStatus} attendu sur ${path}`);
  if (expectedCode) {
    const code = response.json?.code || '';
    assert(code === expectedCode, `Code ${expectedCode} attendu sur ${path}`);
  }
  return response;
}

async function getModule(token) {
  const response = await fetchJson(`/api/cursus/${CURSUS_ID}/module/${MODULE_ID}`, { token });
  assert(response.status === 200, 'GET module retourne 200');
  assert(response.json?.success === true, 'GET module success=true');
  return response.json;
}

async function getUnitDetail(token, unitId) {
  const response = await fetchJson(`/api/cursus/${CURSUS_ID}/module/${MODULE_ID}/units/${unitId}`, { token });
  assert(response.status === 200, `GET unit detail ${unitId} retourne 200`);
  assert(response.json?.success === true, `GET unit detail ${unitId} success=true`);
  return response.json.unit;
}

async function startUnit(token, unitId) {
  const response = await fetchJson(`/api/cursus/${CURSUS_ID}/module/${MODULE_ID}/units/${unitId}/start`, {
    method: 'POST',
    token,
    body: {},
  });
  assert(response.status === 200, `POST start unit ${unitId} retourne 200`);
  assert(response.json?.success === true, `POST start unit ${unitId} success=true`);
  return response.json.unit;
}

async function submitTask(token, unitId, taskId, body) {
  const response = await fetchJson(`/api/cursus/${CURSUS_ID}/module/${MODULE_ID}/units/${unitId}/tasks/${taskId}/submit`, {
    method: 'POST',
    token,
    body,
  });
  assert(response.status === 200, `POST submit task ${taskId} retourne 200`);
  assert(response.json?.success === true, `POST submit task ${taskId} success=true`);
  return response.json.result;
}

async function completeUnitSequentially(token, unit, { expectTaskLocking = true } = {}) {
  const detail = await getUnitDetail(token, unit.unitId);
  const tasks = [...detail.tasks].sort((a, b) => Number(a.taskOrder) - Number(b.taskOrder));
  assert(tasks.length > 0, `UA ${unit.unitCode} contient des taches`);

  if (expectTaskLocking && tasks.length > 1) {
    await expectError(
      `/api/cursus/${CURSUS_ID}/module/${MODULE_ID}/units/${unit.unitId}/tasks/${tasks[1].taskId}/submit`,
      {
        method: 'POST',
        token,
        body: buildSubmission(tasks[1]),
        expectedStatus: 409,
        expectedCode: 'UA_TASK_LOCKED',
      }
    );
  }

  const started = await startUnit(token, unit.unitId);
  assert(Boolean(started.progress), `UA ${unit.unitCode} start initialise la progression`);

  for (const task of tasks) {
    const result = await submitTask(token, unit.unitId, task.taskId, buildSubmission(task));
    assert(result.isCorrect === true, `UA ${unit.unitCode} task ${task.taskOrder} validee`);
    assert(result.completed === true, `UA ${unit.unitCode} task ${task.taskOrder} complete`);
  }

  const done = await getUnitDetail(token, unit.unitId);
  assert(done.progress.status === 'COMPLETED', `UA ${unit.unitCode} passe COMPLETED`);
  return done;
}

function parseSingleLine(line) {
  const firstNonEmpty = String(line)
    .split(/\r?\n/)
    .find((entry) => entry.trim().length > 0);
  if (!firstNonEmpty) return [];
  return firstNonEmpty.split('|').map((entry) => entry.trim());
}

async function main() {
  ensureStudentExists(STUDENT_ID);
  const studentExistsRaw = runSql(`
SELECT COUNT(*)
FROM users.users
WHERE id = '${sqlEscape(STUDENT_ID)}';
`);
  const studentExistsCount = Number(parseSingleLine(studentExistsRaw)[0] || 0);
  assert(studentExistsCount === 1, 'Smoke test student exists in users.users');

  logInfo(`Cleaning student state for deterministic smoke test (${STUDENT_ID})`);
  cleanupStudentState(STUDENT_ID);
  const progressCountRaw = runSql(`
SELECT COUNT(*)
FROM learning.cursus_unit_progress
WHERE student_id = '${sqlEscape(STUDENT_ID)}';
`);
  const progressCount = Number(parseSingleLine(progressCountRaw)[0] || 0);
  assert(progressCount === 0, 'Student state reset (UA progress cleared)');
  logPass('Student state reset (UA sessions cleared)');

  const tokenResp = await fetchJson('/api/auth/token', {
    method: 'POST',
    body: { userId: STUDENT_ID, role: STUDENT_ROLE },
  });
  assert(tokenResp.status === 200, 'POST /api/auth/token retourne 200');
  const token = tokenResp.json?.token;
  assert(Boolean(token), 'JWT de test genere');

  const ctfProgressBefore = await fetchJson('/api/ctf/progress', { token });
  assert(ctfProgressBefore.status === 200, 'GET /api/ctf/progress avant test retourne 200');
  const ctfLeaderboardBefore = await fetchJson('/api/ctf/leaderboard', { token });
  assert(ctfLeaderboardBefore.status === 200, 'GET /api/ctf/leaderboard avant test retourne 200');

  const beforePoints = Number(ctfProgressBefore.json?.summary?.totalPoints || 0);
  const beforeSolved = Number(ctfProgressBefore.json?.summary?.solvedChallenges || 0);
  const beforeLbEntry = (ctfLeaderboardBefore.json?.leaderboard || []).find((row) => row.student_id === STUDENT_ID);
  const beforeLbPoints = Number(beforeLbEntry?.total_points || 0);
  const beforeLbSolved = Number(beforeLbEntry?.challenges_solved || 0);

  const moduleBefore = await getModule(token);
  const uaUnits = Array.isArray(moduleBefore.uaUnits) ? moduleBefore.uaUnits : [];
  assert(uaUnits.length >= 3, 'Le module expose au moins 3 UA');

  const ua11 = uaUnits.find((u) => u.unitCode === '1.1');
  const ua12 = uaUnits.find((u) => u.unitCode === '1.2');
  const ua13 = uaUnits.find((u) => u.unitCode === '1.3');
  assert(Boolean(ua11), 'UA 1.1 presente');
  assert(Boolean(ua12), 'UA 1.2 presente');
  assert(Boolean(ua13), 'UA 1.3 presente');
  assert(ua11.hasLabMachine === false, 'UA 1.1 sans machine');
  assert(ua12.hasLabMachine === false, 'UA 1.2 sans machine');
  assert(ua13.hasLabMachine === true, 'UA 1.3 avec machine');

  const ua12PreStart = await fetchJson(
    `/api/cursus/${CURSUS_ID}/module/${MODULE_ID}/units/${ua12.unitId}/start`,
    { method: 'POST', token, body: {} }
  );
  let expectTaskLocking = true;
  if (ua12PreStart.status === 409) {
    assert(ua12PreStart.json?.code === 'UA_LOCKED', 'Mode strict: start UA 1.2 avant UA 1.1 bloque (UA_LOCKED)');
    logPass('Mode strict active (verrouillage UA)');
    expectTaskLocking = true;
  } else if (ua12PreStart.status === 200) {
    assert(ua12PreStart.json?.success === true, 'Mode test: start UA 1.2 avant UA 1.1 autorise');
    logPass('Mode test actif (verrouillage UA bypass)');
    expectTaskLocking = false;
  } else {
    throw new Error(`HTTP inattendu sur pre-start UA 1.2: ${ua12PreStart.status}`);
  }

  await completeUnitSequentially(token, ua11, { expectTaskLocking });

  const moduleAfterUa11 = await getModule(token);
  const ua12After = (moduleAfterUa11.uaUnits || []).find((u) => u.unitId === ua12.unitId);
  assert(ua12After.status !== 'LOCKED', 'UA 1.2 deverrouillee apres UA 1.1');

  await completeUnitSequentially(token, ua12, { expectTaskLocking });

  const moduleAfterUa12 = await getModule(token);
  const ua13After = (moduleAfterUa12.uaUnits || []).find((u) => u.unitId === ua13.unitId);
  assert(ua13After.status !== 'LOCKED', 'UA 1.3 deverrouillee apres UA 1.2');

  const started13a = await startUnit(token, ua13.unitId);
  assert(started13a.lab?.isEnabled === true, 'UA 1.3 lab active');
  const sessionId1 = getSessionId(started13a.lab?.session);
  assert(Boolean(sessionId1), 'UA 1.3 start cree une session active');

  const started13b = await startUnit(token, ua13.unitId);
  const sessionId2 = getSessionId(started13b.lab?.session);
  assert(sessionId2 === sessionId1, 'Deuxieme start UA 1.3 re-utilise la meme session');

  const activeScopeCountRaw = runSql(`
SELECT COUNT(*)
FROM learning.ctf_lab_sessions
WHERE student_id = '${sqlEscape(STUDENT_ID)}'
  AND session_scope_key = '${sqlEscape(`UA::${ua13.unitId}`)}'
  AND flow_source = 'UA'
  AND status IN ('PROVISIONING', 'RUNNING')
  AND terminated_at IS NULL;
`);
  const activeScopeCount = Number(parseSingleLine(activeScopeCountRaw)[0] || 0);
  assert(activeScopeCount === 1, 'Une seule session active par etudiant/UA');

  const detail13 = await getUnitDetail(token, ua13.unitId);
  const tasks13 = [...detail13.tasks].sort((a, b) => Number(a.taskOrder) - Number(b.taskOrder));
  if (expectTaskLocking && tasks13.length > 1) {
    await expectError(
      `/api/cursus/${CURSUS_ID}/module/${MODULE_ID}/units/${ua13.unitId}/tasks/${tasks13[1].taskId}/submit`,
      {
        method: 'POST',
        token,
        body: buildSubmission(tasks13[1]),
        expectedStatus: 409,
        expectedCode: 'UA_TASK_LOCKED',
      }
    );
  }
  for (const task of tasks13) {
    const result = await submitTask(token, ua13.unitId, task.taskId, buildSubmission(task));
    assert(result.isCorrect === true, `UA 1.3 task ${task.taskOrder} validee`);
  }
  const done13 = await getUnitDetail(token, ua13.unitId);
  assert(done13.progress.status === 'COMPLETED', 'UA 1.3 passe COMPLETED apres flag final');

  const currentSessionResp = await fetchJson(
    `/api/cursus/${CURSUS_ID}/module/${MODULE_ID}/units/${ua13.unitId}/session`,
    { token }
  );
  assert(currentSessionResp.status === 200, 'GET session UA retourne 200');
  const currentSessionId = getSessionId(currentSessionResp.json?.session);
  assert(Boolean(currentSessionId), 'GET session UA retourne une session active');
  const beforeExtendExpiry = Date.parse(String(currentSessionResp.json?.session?.expiresAt || ''));
  assert(Number.isFinite(beforeExtendExpiry), 'Session active expose expiresAt');

  const extendResp = await fetchJson(`/api/cursus/units/${ua13.unitId}/sessions/${currentSessionId}/extend`, {
    method: 'POST',
    token,
    body: {},
  });
  assert(extendResp.status === 200, 'POST extend session UA retourne 200');
  const extendExpiry = Date.parse(String(extendResp.json?.session?.expiresAt || ''));
  assert(Number.isFinite(extendExpiry) && extendExpiry > beforeExtendExpiry, 'Extend augmente expiresAt');
  assert(extendResp.json?.session?.canExtend === false, 'Extend applique la limite d extension');

  const resetResp = await fetchJson(`/api/cursus/units/${ua13.unitId}/sessions/${currentSessionId}/reset`, {
    method: 'POST',
    token,
    body: {},
  });
  assert(resetResp.status === 200, 'POST reset session UA retourne 200');
  const resetSessionId = getSessionId(resetResp.json?.session);
  assert(Boolean(resetSessionId) && resetSessionId !== currentSessionId, 'Reset recree une nouvelle session');

  const terminateResp = await fetchJson(`/api/cursus/units/${ua13.unitId}/sessions/${resetSessionId}`, {
    method: 'DELETE',
    token,
  });
  assert(terminateResp.status === 200, 'DELETE terminate session UA retourne 200');
  const terminatedStatus = String(terminateResp.json?.session?.status || '');
  assert(terminatedStatus === 'STOPPED', 'Terminate passe la session en STOPPED');

  const sessionAfterTerminate = await fetchJson(
    `/api/cursus/${CURSUS_ID}/module/${MODULE_ID}/units/${ua13.unitId}/session`,
    { token }
  );
  assert(sessionAfterTerminate.status === 200, 'GET session apres terminate retourne 200');
  assert(sessionAfterTerminate.json?.session === null, 'Aucune session active apres terminate');

  const ttlStart = await startUnit(token, ua13.unitId);
  const ttlSessionId = getSessionId(ttlStart.lab?.session);
  assert(Boolean(ttlSessionId), 'Session TTL de test creee');

  runSql(`
UPDATE learning.ctf_lab_sessions
SET expires_at = NOW() - interval '1 minute',
    updated_at = NOW()
WHERE id = '${sqlEscape(ttlSessionId)}';
`);

  const ttlCheck = await fetchJson(
    `/api/cursus/${CURSUS_ID}/module/${MODULE_ID}/units/${ua13.unitId}/session`,
    { token }
  );
  assert(ttlCheck.status === 200, 'GET session apres expiration forcee retourne 200');
  assert(ttlCheck.json?.session === null, 'Session expiree n est plus active');

  const ttlStatusRaw = runSql(`
SELECT status, (terminated_at IS NOT NULL)::text
FROM learning.ctf_lab_sessions
WHERE id = '${sqlEscape(ttlSessionId)}'
LIMIT 1;
`);
  const [ttlStatus, ttlTerminated] = parseSingleLine(ttlStatusRaw);
  assert(ttlStatus === 'EXPIRED', 'Expiration TTL passe la session en EXPIRED');
  assert(['t', 'true'].includes(String(ttlTerminated || '').toLowerCase()), 'Session expiree a terminated_at renseigne');

  const ttlInstancesRaw = runSql(`
SELECT COUNT(*) FILTER (WHERE status = 'STOPPED')::int AS stopped_count,
       COUNT(*)::int AS total_count
FROM learning.ctf_lab_instances
WHERE session_id = '${sqlEscape(ttlSessionId)}';
`);
  const [stoppedCountRaw, totalCountRaw] = parseSingleLine(ttlInstancesRaw);
  const stoppedCount = Number(stoppedCountRaw || 0);
  const totalCount = Number(totalCountRaw || 0);
  assert(totalCount === 0 || stoppedCount === totalCount, 'Cleanup session expiree stoppe les instances');

  const ctfChallenges = await fetchJson('/api/ctf/challenges', { token });
  assert(ctfChallenges.status === 200, 'GET /api/ctf/challenges retourne 200');
  const challengeText = JSON.stringify(ctfChallenges.json || {});
  assert(!challengeText.includes(ua11.unitId), '/api/ctf/challenges ne contient pas UA 1.1');
  assert(!challengeText.includes(ua12.unitId), '/api/ctf/challenges ne contient pas UA 1.2');
  assert(!challengeText.includes(ua13.unitId), '/api/ctf/challenges ne contient pas UA 1.3');

  const ctfProgressAfter = await fetchJson('/api/ctf/progress', { token });
  const ctfLeaderboardAfter = await fetchJson('/api/ctf/leaderboard', { token });
  assert(ctfProgressAfter.status === 200, 'GET /api/ctf/progress apres test retourne 200');
  assert(ctfLeaderboardAfter.status === 200, 'GET /api/ctf/leaderboard apres test retourne 200');

  const afterPoints = Number(ctfProgressAfter.json?.summary?.totalPoints || 0);
  const afterSolved = Number(ctfProgressAfter.json?.summary?.solvedChallenges || 0);
  const afterLbEntry = (ctfLeaderboardAfter.json?.leaderboard || []).find((row) => row.student_id === STUDENT_ID);
  const afterLbPoints = Number(afterLbEntry?.total_points || 0);
  const afterLbSolved = Number(afterLbEntry?.challenges_solved || 0);

  assert(afterPoints === beforePoints, 'Points CTF inchanges apres progression UA');
  assert(afterSolved === beforeSolved, 'Solved CTF inchanges apres progression UA');
  assert(afterLbPoints === beforeLbPoints, 'Leaderboard points inchanges apres progression UA');
  assert(afterLbSolved === beforeLbSolved, 'Leaderboard solved inchanges apres progression UA');

  logInfo('All UA + CTF smoke checks passed');
}

let fatalError = null;

try {
  await main();
} catch (error) {
  fatalError = error instanceof Error ? error.message : String(error);
  logFail(fatalError);
}

const report = buildStructuredReport({ fatalError });
writeStructuredReport(report);
process.exitCode = report.status === 'FAIL' ? 1 : 0;
