#!/usr/bin/env node
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);

function loadPlaywright() {
  try {
    return require('playwright');
  } catch {}

  try {
    return require('../../tests/e2e/node_modules/playwright');
  } catch (error) {
    throw new Error(
      'Playwright introuvable. Installez les dependances de tests/e2e ou exposez le paquet "playwright".'
    );
  }
}

const { chromium } = loadPlaywright();

const DEFAULT_TIMEOUT_MS = Number(process.env.PMP_FRONTEND_SMOKE_TIMEOUT_MS || 45000);
const LOGIN_TIMEOUT_MS = Number(process.env.PMP_FRONTEND_LOGIN_TIMEOUT_MS || 15000);
const headless = process.env.PMP_FRONTEND_SMOKE_HEADLESS !== '0';
const REPORT_JSON_PATH = (process.env.PMP_SMOKE_REPORT_JSON || '').trim();
const STARTED_AT = new Date().toISOString();

const BASE_URL = (process.env.PMP_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');
const APPS = {
  portal: (process.env.PMP_PORTAL_URL || 'http://localhost:3000').replace(/\/+$/, ''),
  tpe: (process.env.PMP_TPE_URL || 'http://localhost:3001').replace(/\/+$/, ''),
  cards: (process.env.PMP_USER_CARDS_URL || 'http://localhost:3004').replace(/\/+$/, ''),
  hsm: (process.env.PMP_HSM_WEB_URL || 'http://localhost:3006').replace(/\/+$/, ''),
  monitoring: (process.env.PMP_MONITORING_URL || 'http://localhost:3082').replace(/\/+$/, ''),
  threeDS: (process.env.PMP_3DS_URL || 'http://localhost:3088').replace(/\/+$/, ''),
};

const CREDENTIALS = {
  client: {
    endpoint: '/api/auth/client/login',
    email: process.env.PMP_SMOKE_CLIENT_EMAIL || 'client@pmp.edu',
    password: process.env.PMP_SMOKE_CLIENT_PASSWORD || 'qa-pass-123',
    body: {},
  },
  merchant: {
    endpoint: '/api/auth/marchand/login',
    email: process.env.PMP_SMOKE_MERCHANT_EMAIL || 'bakery@pmp.edu',
    password: process.env.PMP_SMOKE_MERCHANT_PASSWORD || 'qa-pass-123',
    body: {
      certificate: process.env.PMP_SMOKE_MERCHANT_CERTIFICATE || 'SIMULATED_CERT_001',
    },
  },
  student: {
    endpoint: '/api/auth/etudiant/login',
    email: process.env.PMP_SMOKE_STUDENT_EMAIL || 'student01@pmp.edu',
    password: process.env.PMP_SMOKE_STUDENT_PASSWORD || 'qa-pass-123',
    body: {},
  },
  trainer: {
    endpoint: '/api/auth/formateur/login',
    email: process.env.PMP_SMOKE_TRAINER_EMAIL || 'trainer@pmp.edu',
    password: process.env.PMP_SMOKE_TRAINER_PASSWORD || 'qa-pass-123',
    body: {
      code2fa: process.env.PMP_SMOKE_TRAINER_2FA || '123456',
      '2fa_code': process.env.PMP_SMOKE_TRAINER_2FA || '123456',
    },
  },
};

const TEST_RESULTS = [];
let executedChecks = 0;

const CHECKS = [
  {
    id: 'portal-login-ui',
    category: 'portal',
    mode: 'portal-login-ui',
    url: `${APPS.portal}/login?role=ROLE_ETUDIANT`,
    texts: ['Acceder a votre espace', 'Mode test:', 'Se connecter'],
    successUrlFragment: '/student',
    successTexts: ['Mission du jour', "Roadmap d'apprentissage"],
  },
  {
    id: 'portal-merchant-dashboard',
    category: 'portal',
    mode: 'session',
    sessionKey: 'merchant',
    url: `${APPS.portal}/merchant`,
    successUrlFragment: '/merchant',
    successTexts: ['Dashboard Marchand', 'Transactions recentes'],
  },
  {
    id: 'portal-instructor-dashboard',
    category: 'portal',
    mode: 'session',
    sessionKey: 'trainer',
    url: `${APPS.portal}/instructor`,
    successUrlFragment: '/instructor',
    successTexts: ['Poste de commande learning', 'Etudiants actifs'],
  },
  {
    id: 'tpe-web-terminal',
    category: 'tpe-web',
    mode: 'session',
    sessionKey: 'merchant',
    url: `${APPS.tpe}/`,
    successUrlFragment: `${APPS.tpe}/`,
    successTexts: ['Terminal de paiement', 'Controles terminal', 'Lecteur de carte virtuel'],
  },
  {
    id: 'user-cards-dashboard',
    category: 'user-cards-web',
    mode: 'session',
    sessionKey: 'client',
    url: `${APPS.cards}/`,
    successUrlFragment: `${APPS.cards}/`,
    successTexts: ['Espace client', 'Compte bancaire', 'Cartes actives'],
  },
  {
    id: 'hsm-vulnerability-lab',
    category: 'hsm-web',
    mode: 'session',
    sessionKey: 'trainer',
    url: `${APPS.hsm}/vuln`,
    successUrlFragment: '/vuln',
    successTexts: ['Vulnerability Lab', 'Attack Scenarios', 'Quick Defense'],
  },
  {
    id: 'monitoring-dashboard-overview',
    category: 'monitoring-dashboard',
    mode: 'public',
    url: `${APPS.monitoring}/`,
    successUrlFragment: `${APPS.monitoring}/`,
    successTexts: ['Vue globale du systeme', 'Transactions recentes', 'Latence par service'],
  },
  {
    id: '3ds-challenge-flow',
    category: '3ds-challenge-ui',
    mode: '3ds-interactive',
    url: `${APPS.threeDS}/?txId=TX_SMOKE_UI&acsTransId=ACS_SMOKE_UI`,
    texts: ['Confirmez votre paiement', 'Code OTP', 'Flux 3DS en cours'],
    successTexts: ['Challenge valide', 'Authentification validee'],
  },
];

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
    suite: 'frontend-apps-smoke',
    status: failed > 0 || fatalError ? 'FAIL' : 'PASS',
    startedAt: STARTED_AT,
    finishedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    headless,
    apps: APPS,
    executedChecks,
    summary: {
      total: executedChecks,
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

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function shouldRunCheck(check) {
  const rawFilter = String(process.env.PMP_FRONTEND_APPS || '').trim();
  if (!rawFilter) return true;

  const filters = rawFilter
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return filters.includes(check.id.toLowerCase()) || filters.includes(check.category.toLowerCase());
}

async function fetchJson(path, body) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS);

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    return {
      ok: response.ok,
      status: response.status,
      text,
      json,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function loginPersona(personaKey) {
  const persona = CREDENTIALS[personaKey];
  if (!persona) {
    throw new Error(`Persona inconnue: ${personaKey}`);
  }

  const response = await fetchJson(persona.endpoint, {
    email: persona.email,
    password: persona.password,
    ...persona.body,
  });

  if (!response.ok || !response.json?.accessToken || !response.json?.user) {
    throw new Error(
      `Login ${personaKey} impossible (${response.status}) ${response.json?.error || response.text || ''}`.trim()
    );
  }

  return {
    accessToken: response.json.accessToken,
    refreshToken: response.json.refreshToken || null,
    user: response.json.user,
  };
}

async function prepareSessionContext(browser, url, session) {
  const context = await browser.newContext();
  const origin = new URL(url).origin;

  await context.addCookies([
    { name: 'token', value: session.accessToken, url: origin },
    ...(session.refreshToken ? [{ name: 'refreshToken', value: session.refreshToken, url: origin }] : []),
  ]);

  await context.addInitScript(({ token, refreshToken, user }) => {
    window.localStorage.setItem('token', token);
    window.localStorage.setItem('user', JSON.stringify(user));
    window.localStorage.setItem('role', user.role);
    if (refreshToken) {
      window.localStorage.setItem('refreshToken', refreshToken);
    }
  }, {
    token: session.accessToken,
    refreshToken: session.refreshToken,
    user: session.user,
  });

  return context;
}

async function readBodyText(page) {
  try {
    return await page.locator('body').innerText();
  } catch {
    return '';
  }
}

async function waitForTexts(page, expectedTexts, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  let lastBodyText = '';

  while (Date.now() < deadline) {
    lastBodyText = await readBodyText(page);
    const normalizedBody = normalizeText(lastBodyText);
    const allFound = expectedTexts.every((text) => normalizedBody.includes(normalizeText(text)));
    if (allFound) {
      return lastBodyText;
    }
    await page.waitForTimeout(400);
  }

  throw new Error(
    `Textes attendus absents: ${expectedTexts.join(', ')}. Extrait: ${lastBodyText.replace(/\s+/g, ' ').slice(0, 500)}`
  );
}

function assertUrlFragment(actualUrl, expectedFragment) {
  if (!expectedFragment) return;
  if (!String(actualUrl).includes(expectedFragment)) {
    throw new Error(`URL inattendue. Recu: ${actualUrl} | attendu: ${expectedFragment}`);
  }
}

async function navigate(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: DEFAULT_TIMEOUT_MS });
}

async function runPublicCheck(browser, check) {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await navigate(page, check.url);
    await waitForTexts(page, check.successTexts || check.texts);
    assertUrlFragment(page.url(), check.successUrlFragment);
    logPass(`${check.id} -> ${page.url()}`);
  } finally {
    await context.close();
  }
}

async function runSessionCheck(browser, check, sessions) {
  const session = sessions[check.sessionKey];
  if (!session) {
    throw new Error(`Session absente pour ${check.sessionKey}`);
  }

  const context = await prepareSessionContext(browser, check.url, session);
  const page = await context.newPage();

  try {
    await navigate(page, check.url);
    await waitForTexts(page, check.successTexts);
    assertUrlFragment(page.url(), check.successUrlFragment);
    logPass(`${check.id} -> ${page.url()}`);
  } finally {
    await context.close();
  }
}

async function runPortalLoginUiCheck(browser, check) {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await navigate(page, check.url);
    await waitForTexts(page, check.texts);
    await page.fill('#email', CREDENTIALS.student.email);
    await page.fill('#password', CREDENTIALS.student.password);
    await page.getByRole('button', { name: /Se connecter/i }).click();
    await page.waitForURL((url) => url.pathname.startsWith('/student'), { timeout: DEFAULT_TIMEOUT_MS });
    await waitForTexts(page, check.successTexts);
    assertUrlFragment(page.url(), check.successUrlFragment);
    logPass(`${check.id} -> ${page.url()}`);
  } finally {
    await context.close();
  }
}

async function runThreeDSInteractiveCheck(browser, check) {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await navigate(page, check.url);
    await waitForTexts(page, check.texts);
    await page.fill('#otp-input', '123456');
    await page.getByRole('button', { name: /Valider le challenge/i }).click();
    await waitForTexts(page, check.successTexts);
    logPass(`${check.id} -> ${page.url()}`);
  } finally {
    await context.close();
  }
}

async function runCheck(browser, check, sessions) {
  if (check.mode === 'portal-login-ui') {
    await runPortalLoginUiCheck(browser, check);
    return;
  }

  if (check.mode === '3ds-interactive') {
    await runThreeDSInteractiveCheck(browser, check);
    return;
  }

  if (check.mode === 'session') {
    await runSessionCheck(browser, check, sessions);
    return;
  }

  await runPublicCheck(browser, check);
}

async function main() {
  logInfo(`Frontend smoke base API: ${BASE_URL}`);
  logInfo(`Applications ciblees: ${Object.values(APPS).join(', ')}`);

  const sessions = {
    client: await loginPersona('client'),
    merchant: await loginPersona('merchant'),
    student: await loginPersona('student'),
    trainer: await loginPersona('trainer'),
  };

  const browser = await chromium.launch({ headless });
  try {
    for (const check of CHECKS) {
      if (!shouldRunCheck(check)) {
        logInfo(`Check ignore par filtre: ${check.id}`);
        continue;
      }

      executedChecks += 1;
      logInfo(`Check frontend: ${check.id}`);

      try {
        await runCheck(browser, check, sessions);
      } catch (error) {
        logFail(`${check.id} -> ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } finally {
    await browser.close();
  }

  if (executedChecks === 0) {
    throw new Error('Aucun check frontend execute. Verifiez PMP_FRONTEND_APPS.');
  }

  const failedChecks = TEST_RESULTS.filter((result) => result.status === 'FAIL').length;
  logInfo(`Frontend smoke termine: ${executedChecks - failedChecks}/${executedChecks} checks OK`);
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
