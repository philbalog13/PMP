#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), '..', '..');
const composeFile = 'docker-compose-runtime.yml';
const now = new Date();

function formatTimestamp(date) {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

function parseArgs(argv) {
  const args = { outputDir: '' };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--output-dir') {
      args.outputDir = String(argv[index + 1] || '').trim();
      index += 1;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      args.help = true;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }
  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/qa/export_runtime_evidence.mjs [--output-dir <path>]

Description:
  Runs the official runtime smoke suites, captures machine-readable outputs,
  and writes a standardized evidence folder under docs/test-evidence/.`);
}

function ensureDir(dirPath) {
  mkdirSync(dirPath, { recursive: true });
}

function writeText(filePath, content) {
  ensureDir(path.dirname(filePath));
  writeFileSync(filePath, content, 'utf8');
}

function writeJson(filePath, value) {
  writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function runCapture(command, args, label, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...extraEnv,
    },
  });

  return {
    label,
    command: [command, ...args].join(' '),
    status: result.status ?? 1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error ? String(result.error.message || result.error) : null,
  };
}

function readJsonIfExists(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function getGitValue(args) {
  const result = runCapture('git', args, `git ${args.join(' ')}`);
  if (result.status !== 0) {
    return null;
  }
  return result.stdout.trim() || null;
}

function normalizeFailures(report) {
  if (!report || !Array.isArray(report.results)) {
    return [];
  }
  return report.results
    .filter((entry) => entry.status === 'FAIL')
    .map((entry) => String(entry.message || '').trim())
    .filter(Boolean);
}

function renderSuiteLine(label, report, fallbackStatus) {
  if (!report) {
    return `- ${label}: ${fallbackStatus} (rapport JSON manquant)`;
  }

  const summary = report.summary || {};
  return `- ${label}: ${report.status} (${summary.passed || 0}/${summary.total || 0} checks OK)`;
}

function renderMarkdownReport({
  metadata,
  suiteReports,
  commands,
  outputFiles,
  overallStatus,
  gaps,
}) {
  const commandLines = commands.map((entry) => `- \`${entry.command}\` -> exit ${entry.status}`);
  const gapLines = gaps.length > 0 ? gaps.map((entry) => `- ${entry}`) : ['- Aucun ecart.'];
  const artifactLines = outputFiles.map((entry) => `- \`${entry}\``);

  return `# Rapport de recette runtime automatisee - ${metadata.runId}

Date: ${metadata.generatedAt}
Commit: ${metadata.git.commit || 'indisponible'}
Branche: ${metadata.git.branch || 'indisponible'}
Workspace: ${metadata.repoRoot}

## Environnement

- OS: ${metadata.environment.platform}
- Node.js: ${metadata.environment.node}
- Docker Compose: ${metadata.environment.dockerCompose || 'indisponible'}
- Base URL API: ${metadata.environment.baseUrl}

## Commandes executees

${commandLines.join('\n')}

## Resultat global

- Statut: **${overallStatus}**
- Suites:
${renderSuiteLine('UA + CTF smoke', suiteReports.ua, commands.find((entry) => entry.label === 'ua-ctf-smoke')?.status === 0 ? 'PASS' : 'FAIL')}
${renderSuiteLine('Frontend apps smoke', suiteReports.frontend, commands.find((entry) => entry.label === 'frontend-apps-smoke')?.status === 0 ? 'PASS' : 'FAIL')}

## Ecarts

${gapLines.join('\n')}

## Artefacts

${artifactLines.join('\n')}
`;
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  printHelp();
  process.exit(0);
}

const runId = `${formatTimestamp(now)}-runtime-evidence`;
const outputDir = args.outputDir
  ? path.resolve(repoRoot, args.outputDir)
  : path.join(repoRoot, 'docs', 'test-evidence', runId);

ensureDir(outputDir);

const metadata = {
  runId,
  generatedAt: now.toISOString(),
  repoRoot,
  git: {
    commit: getGitValue(['rev-parse', 'HEAD']),
    branch: getGitValue(['rev-parse', '--abbrev-ref', 'HEAD']),
    dirty: getGitValue(['status', '--short']) || '',
  },
  environment: {
    platform: `${os.platform()} ${os.release()}`,
    node: process.version,
    dockerCompose: null,
    baseUrl: process.env.PMP_BASE_URL || 'http://localhost:8000',
  },
};

const dockerComposeVersion = runCapture('docker', ['compose', 'version'], 'docker-compose-version');
metadata.environment.dockerCompose = dockerComposeVersion.status === 0
  ? dockerComposeVersion.stdout.trim()
  : null;

const servicesSnapshot = runCapture('docker', ['compose', '-f', composeFile, 'config', '--services'], 'compose-services');
const psSnapshot = runCapture('docker', ['compose', '-f', composeFile, 'ps'], 'compose-ps');

writeText(path.join(outputDir, 'docker-compose-services.txt'), servicesSnapshot.stdout || servicesSnapshot.stderr);
writeText(path.join(outputDir, 'docker-compose-ps.txt'), psSnapshot.stdout || psSnapshot.stderr);

const uaJsonPath = path.join(outputDir, 'ua-ctf-smoke.json');
const frontendJsonPath = path.join(outputDir, 'frontend-apps-smoke.json');

const commands = [
  servicesSnapshot,
  psSnapshot,
  runCapture(process.execPath, [path.join('scripts', 'qa', 'ua_ctf_e2e_smoke.mjs')], 'ua-ctf-smoke', {
    PMP_SMOKE_REPORT_JSON: uaJsonPath,
  }),
  runCapture(process.execPath, [path.join('scripts', 'qa', 'frontend_apps_smoke.mjs')], 'frontend-apps-smoke', {
    PMP_SMOKE_REPORT_JSON: frontendJsonPath,
  }),
];

for (const command of commands) {
  if (command.label === 'compose-services' || command.label === 'compose-ps') {
    continue;
  }
  writeText(path.join(outputDir, `${command.label}.stdout.log`), command.stdout);
  writeText(path.join(outputDir, `${command.label}.stderr.log`), command.stderr);
}

const suiteReports = {
  ua: readJsonIfExists(uaJsonPath),
  frontend: readJsonIfExists(frontendJsonPath),
};

writeJson(path.join(outputDir, 'metadata.json'), metadata);

const gaps = [
  ...normalizeFailures(suiteReports.ua),
  ...normalizeFailures(suiteReports.frontend),
];

if (servicesSnapshot.status !== 0) {
  gaps.unshift('Impossible de snapshotter `docker compose config --services`.');
}
if (psSnapshot.status !== 0) {
  gaps.unshift('Impossible de snapshotter `docker compose ps`.');
}

const overallStatus = gaps.length > 0 ? 'NON CONFORME' : 'CONFORME';
const outputFiles = [
  'REPORT.md',
  'metadata.json',
  'docker-compose-services.txt',
  'docker-compose-ps.txt',
  'ua-ctf-smoke.json',
  'frontend-apps-smoke.json',
  'ua-ctf-smoke.stdout.log',
  'ua-ctf-smoke.stderr.log',
  'frontend-apps-smoke.stdout.log',
  'frontend-apps-smoke.stderr.log',
];

const reportMarkdown = renderMarkdownReport({
  metadata,
  suiteReports,
  commands,
  outputFiles,
  overallStatus,
  gaps,
});

writeText(path.join(outputDir, 'REPORT.md'), reportMarkdown);

console.log(`[INFO] Runtime evidence exported to ${outputDir}`);
console.log(`[INFO] Overall status: ${overallStatus}`);

process.exitCode = overallStatus === 'CONFORME' ? 0 : 1;
