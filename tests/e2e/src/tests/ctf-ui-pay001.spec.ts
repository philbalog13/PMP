import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

type StudentAccount = {
  label: string;
  email: string;
  password: string;
};

type SessionSnapshot = {
  status: string;
  machineIp: string | null;
  attackboxPath: string | null;
  timeRemainingSec: number | null;
};

const BASE_URL = process.env.PMP_PORTAL_URL || 'http://localhost:3000';
const CHALLENGE_CODE = 'PAY-001';
const FLAG_BASE = 'PAY_TERMINAL_CLEARTEXT';
const FLAG_SECRET = resolveFlagSecret();

const STUDENTS: StudentAccount[] = [
  { label: 'georges', email: 'georges@pmp.local', password: 'GxT!Edu2026#PMP' },
  { label: 'bibi', email: 'bibi@pmp.local', password: 'Bibi!Edu2026#PMP' },
];

function resolveFlagSecret(): string {
  if (process.env.CTF_FLAG_SECRET && process.env.CTF_FLAG_SECRET.trim().length > 0) {
    return process.env.CTF_FLAG_SECRET.trim();
  }

  const candidateEnvPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '..', '..', '.env'),
  ];

  for (const envPath of candidateEnvPaths) {
    if (!fs.existsSync(envPath)) {
      continue;
    }

    const envText = fs.readFileSync(envPath, 'utf8');
    for (const rawLine of envText.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) {
        continue;
      }
      const idx = line.indexOf('=');
      if (idx < 0) {
        continue;
      }
      const key = line.slice(0, idx).trim();
      if (key !== 'CTF_FLAG_SECRET') {
        continue;
      }
      const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (value) {
        return value;
      }
    }
  }

  return 'pmp_ctf_default_secret_change_in_prod';
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length < 2) {
    throw new Error('Token JWT invalide (segments manquants).');
  }
  const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
  return JSON.parse(payload) as Record<string, unknown>;
}

function computeExpectedFlag(studentId: string): string {
  const suffix = crypto
    .createHmac('sha256', FLAG_SECRET)
    .update(`${CHALLENGE_CODE}:${studentId}`)
    .digest('hex')
    .slice(0, 6)
    .toUpperCase();
  return `PMP{${FLAG_BASE}_${suffix}}`;
}

async function loginViaUi(page: any, student: StudentAccount): Promise<void> {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('#email').fill(student.email);
  await page.locator('input[autocomplete="current-password"]').first().fill(student.password);
  await page.getByRole('button', { name: /Se connecter/i }).first().click();
  await page.waitForURL(/\/student(?:\/|$)/, { timeout: 30_000 });
}

async function readToken(page: any): Promise<string> {
  const token = await page.evaluate(() => localStorage.getItem('token'));
  if (!token || typeof token !== 'string') {
    throw new Error('Token introuvable dans localStorage apres connexion.');
  }
  return token;
}

async function fetchSession(page: any): Promise<SessionSnapshot | null> {
  const payload = await page.evaluate(async (challengeCode: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      return { ok: false, status: 401, data: null };
    }
    const res = await fetch(`/api/ctf/challenges/${encodeURIComponent(challengeCode)}/session`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }, CHALLENGE_CODE);

  if (!payload.ok || !payload.data?.success) {
    return null;
  }

  const session = payload.data.session;
  if (!session) {
    return null;
  }

  return {
    status: String(session.status || ''),
    machineIp: session.machineIp ? String(session.machineIp) : null,
    attackboxPath: session.attackboxPath ? String(session.attackboxPath) : null,
    timeRemainingSec: Number.isFinite(Number(session.timeRemainingSec))
      ? Number(session.timeRemainingSec)
      : null,
  };
}

async function ensureSessionRunningFromUi(page: any): Promise<SessionSnapshot> {
  await page.goto(`${BASE_URL}/student/ctf/${CHALLENGE_CODE}`, { waitUntil: 'domcontentloaded' });

  const startRoomBtn = page.getByRole('button', { name: /Start Room/i });
  const startMachineBtn = page.getByRole('button', { name: /Start Machine/i });

  if (await startRoomBtn.isVisible().catch(() => false)) {
    await startRoomBtn.click();
  } else if (await startMachineBtn.isVisible().catch(() => false)) {
    await startMachineBtn.click();
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < 90_000) {
    const session = await fetchSession(page);
    if (session?.status === 'RUNNING') {
      return session;
    }
    await page.waitForTimeout(1_000);
  }

  throw new Error('La session PAY-001 n est pas passee en RUNNING dans le delai imparti.');
}

async function ensureTerminalAccessible(page: any): Promise<string> {
  await page.goto(`${BASE_URL}/student/ctf/${CHALLENGE_CODE}/terminal`, { waitUntil: 'domcontentloaded' });
  const iframe = page.locator('iframe[title="CTF AttackBox"]');
  await expect(iframe).toBeVisible({ timeout: 45_000 });

  const iframeSrc = await iframe.getAttribute('src');
  if (!iframeSrc) {
    throw new Error('Iframe AttackBox sans source.');
  }
  if (!iframeSrc.includes('/lab/sessions/')) {
    throw new Error(`Source AttackBox inattendue: ${iframeSrc}`);
  }

  const absolute = iframeSrc.startsWith('http') ? iframeSrc : `${BASE_URL}${iframeSrc}`;
  const probe = await page.context().newPage();
  try {
    const response = await probe.goto(absolute, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    if (!response) {
      throw new Error('Aucune reponse HTTP sur la page AttackBox.');
    }
    if (response.status() >= 400) {
      throw new Error(`AttackBox HTTP ${response.status()} sur ${absolute}`);
    }
  } finally {
    await probe.close();
  }

  return absolute;
}

async function goToFlagTaskAndSubmit(page: any, expectedFlag: string): Promise<'Correct flag!' | 'Already solved!'> {
  await page.goto(`${BASE_URL}/student/ctf/${CHALLENGE_CODE}`, { waitUntil: 'domcontentloaded' });

  const flagInput = page.getByPlaceholder('PMP{...}');

  for (let i = 0; i < 20; i += 1) {
    if (await flagInput.isVisible().catch(() => false)) {
      break;
    }

    const markNextBtn = page.getByRole('button', { name: /Mark Complete & Next/i });
    if (await markNextBtn.isVisible().catch(() => false)) {
      await markNextBtn.click();
      await page.waitForTimeout(600);
      continue;
    }

    const findFlagBtn = page.getByRole('button', { name: /^Find the Flag$/i });
    if (await findFlagBtn.isVisible().catch(() => false)) {
      await findFlagBtn.click();
      await page.waitForTimeout(300);
      continue;
    }

    const startRoomBtn = page.getByRole('button', { name: /Start Room/i });
    if (await startRoomBtn.isVisible().catch(() => false)) {
      await startRoomBtn.click();
      await page.waitForTimeout(1_000);
      continue;
    }

    const startMachineBtn = page.getByRole('button', { name: /Start Machine/i });
    if (await startMachineBtn.isVisible().catch(() => false)) {
      await startMachineBtn.click();
      await page.waitForTimeout(1_000);
      continue;
    }

    await page.waitForTimeout(500);
  }

  await expect(flagInput).toBeVisible({ timeout: 20_000 });
  await flagInput.fill(expectedFlag);
  await page.getByRole('button', { name: /Submit Flag/i }).click();

  const success = page.getByText(/Correct flag!|Already solved!/i).first();
  await expect(success).toBeVisible({ timeout: 25_000 });
  const text = (await success.textContent()) || '';
  if (/Already solved!/i.test(text)) {
    return 'Already solved!';
  }
  return 'Correct flag!';
}

test.describe('THM-like UI E2E PAY-001', () => {
  test.setTimeout(6 * 60_000);

  test('georges + bibi complete Start -> Terminal -> Submit flow', async ({ browser }) => {
    const results: Array<Record<string, unknown>> = [];
    fs.mkdirSync(path.resolve(process.cwd(), 'test-results'), { recursive: true });

    for (const student of STUDENTS) {
      const context = await browser.newContext({ baseURL: BASE_URL });
      const page = await context.newPage();

      try {
        await loginViaUi(page, student);
        const token = await readToken(page);
        const tokenPayload = decodeJwtPayload(token);
        const userIdRaw = tokenPayload.userId ?? tokenPayload.sub ?? tokenPayload.id;
        if (typeof userIdRaw !== 'string' || !userIdRaw) {
          throw new Error('Impossible de determiner userId depuis le JWT.');
        }

        const runningSession = await ensureSessionRunningFromUi(page);
        const attackboxUrl = await ensureTerminalAccessible(page);
        const expectedFlag = computeExpectedFlag(userIdRaw);
        const submissionResult = await goToFlagTaskAndSubmit(page, expectedFlag);

        const screenshotPath = path.resolve(process.cwd(), 'test-results', `thm-ui-${student.label}-pay001.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });

        results.push({
          student: student.label,
          email: student.email,
          userId: userIdRaw,
          sessionStatus: runningSession.status,
          machineIp: runningSession.machineIp,
          attackboxPath: runningSession.attackboxPath,
          attackboxUrl,
          submissionResult,
          expectedFlag,
          screenshotPath,
          status: 'passed',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({
          student: student.label,
          email: student.email,
          status: 'failed',
          error: message,
        });
      } finally {
        await context.close();
      }
    }

    const reportPath = path.resolve(process.cwd(), 'test-results', 'thm-ui-pay001-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2), 'utf8');

    const failures = results.filter((entry) => entry.status !== 'passed');
    expect(
      failures,
      `E2E failures detected. Full report: ${reportPath}\n${JSON.stringify(results, null, 2)}`
    ).toHaveLength(0);
  });
});
