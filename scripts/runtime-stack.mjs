#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), '..');
const composeFile = 'docker-compose-runtime.yml';

const imageBuildPlan = [
  { image: 'pmp-api-gateway', context: 'backend/api-gateway', dockerfile: 'backend/api-gateway/Dockerfile' },
  { image: 'pmp-sim-card-service', context: 'backend/sim-card-service', dockerfile: 'backend/sim-card-service/Dockerfile' },
  { image: 'pmp-sim-pos-service', context: 'backend/sim-pos-service', dockerfile: 'backend/sim-pos-service/Dockerfile' },
  { image: 'pmp-sim-acquirer-service', context: 'backend/sim-acquirer-service', dockerfile: 'backend/sim-acquirer-service/Dockerfile' },
  { image: 'pmp-sim-clearing-engine', context: 'backend/sim-clearing-engine', dockerfile: 'backend/sim-clearing-engine/Dockerfile' },
  { image: 'pmp-sim-network-switch', context: 'backend/sim-network-switch', dockerfile: 'backend/sim-network-switch/Dockerfile' },
  { image: 'pmp-sim-issuer-service', context: 'backend/sim-issuer-service', dockerfile: 'backend/sim-issuer-service/Dockerfile' },
  { image: 'pmp-sim-auth-engine', context: 'backend/sim-auth-engine', dockerfile: 'backend/sim-auth-engine/Dockerfile' },
  { image: 'pmp-sim-fraud-detection', context: 'backend/sim-fraud-detection', dockerfile: 'backend/sim-fraud-detection/Dockerfile' },
  { image: 'pmp-sim-monitoring-service', context: 'backend/monitoring-service', dockerfile: 'backend/monitoring-service/Dockerfile' },
  { image: 'pmp-crypto-service', context: 'backend/crypto-service', dockerfile: 'backend/crypto-service/Dockerfile' },
  { image: 'pmp-hsm-simulator', context: 'backend/hsm-simulator', dockerfile: 'backend/hsm-simulator/Dockerfile' },
  { image: 'pmp-key-management', context: 'backend/key-management', dockerfile: 'backend/key-management/Dockerfile' },
  { image: 'pmp-acs-simulator', context: 'backend/acs-simulator', dockerfile: 'backend/acs-simulator/Dockerfile' },
  { image: 'pmp-client-interface', context: 'frontend', dockerfile: 'frontend/tpe-web/Dockerfile' },
  { image: 'pmp-3ds-challenge-ui', context: 'frontend', dockerfile: 'frontend/3ds-challenge-ui/Dockerfile' },
  { image: 'pmp-portal', context: 'frontend', dockerfile: 'frontend/portal/Dockerfile' },
  { image: 'pmp-user-cards-web', context: 'frontend', dockerfile: 'frontend/user-cards-web/Dockerfile' },
  { image: 'pmp-monitoring-dashboard', context: 'frontend', dockerfile: 'frontend/monitoring-dashboard/Dockerfile' },
  { image: 'pmp-hsm-web', context: 'frontend', dockerfile: 'frontend/hsm-web/Dockerfile' },
];

function logInfo(message) {
  console.log(`[INFO] ${message}`);
}

function printHelp() {
  console.log(`Usage:
  node scripts/runtime-stack.mjs up [--no-build] [--skip-image-bootstrap]
  node scripts/runtime-stack.mjs down
  node scripts/runtime-stack.mjs logs
  node scripts/runtime-stack.mjs smoke
  node scripts/runtime-stack.mjs frontend-smoke
  node scripts/runtime-stack.mjs test-all [--no-build] [--skip-image-bootstrap] [--skip-frontend-smoke]
  node scripts/runtime-stack.mjs evidence [--no-build] [--skip-image-bootstrap]

Options:
  --no-build               Skip "docker compose ... --build"
  --skip-image-bootstrap   Skip missing image bootstrap before compose up
  --skip-frontend-smoke    Skip frontend smoke during "test-all"
  --help                   Show this help

Notes:
  - This CLI is the runtime source of truth for Windows and Unix.
  - Makefile and PowerShell wrappers should delegate to this script.`);
}

function runCommand(command, args, label, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  if ((result.status ?? 0) !== 0) {
    throw new Error(`${label} failed (exit=${result.status ?? 'unknown'})`);
  }
}

function runQuiet(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'ignore',
  });

  if (result.error) {
    return false;
  }

  return (result.status ?? 1) === 0;
}

function runNodeScript(relativeScript, label) {
  runCommand(process.execPath, [path.join(repoRoot, relativeScript)], label);
}

function runCompose(args, label) {
  runCommand('docker', ['compose', '-f', composeFile, ...args], label);
}

function imageExists(image) {
  return runQuiet('docker', ['image', 'inspect', image]);
}

function bootstrapMissingImages() {
  for (const item of imageBuildPlan) {
    if (imageExists(item.image)) {
      continue;
    }

    logInfo(`Building missing image: ${item.image}`);
    runCommand('docker', ['build', '-t', item.image, '-f', item.dockerfile, item.context], `docker build ${item.image}`);
  }
}

function parseOptions(rawArgs) {
  const options = {
    build: true,
    skipImageBootstrap: false,
    skipFrontendSmoke: false,
  };

  for (const arg of rawArgs) {
    if (arg === '--no-build') {
      options.build = false;
      continue;
    }
    if (arg === '--skip-image-bootstrap') {
      options.skipImageBootstrap = true;
      continue;
    }
    if (arg === '--skip-frontend-smoke') {
      options.skipFrontendSmoke = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function startRuntime({ build, skipImageBootstrap }) {
  logInfo(`Runtime deployment root: ${repoRoot}`);

  if (!skipImageBootstrap) {
    bootstrapMissingImages();
  }

  const composeArgs = ['up', '-d'];
  if (build) {
    composeArgs.push('--build');
  }

  logInfo('Starting runtime stack...');
  runCompose(composeArgs, 'docker compose runtime up');
}

function runSmokeSuite() {
  logInfo('Running UA + CTF smoke test...');
  runNodeScript('scripts/qa/ua_ctf_e2e_smoke.mjs', 'UA + CTF smoke test');
}

function runFrontendSmokeSuite() {
  logInfo('Running frontend smoke test...');
  runNodeScript('scripts/qa/frontend_apps_smoke.mjs', 'frontend smoke test');
}

function main() {
  const [command = 'help', ...rawArgs] = process.argv.slice(2);
  const options = parseOptions(rawArgs);

  if (options.help || command === 'help') {
    printHelp();
    return;
  }

  switch (command) {
    case 'up':
      startRuntime(options);
      logInfo('Runtime stack started.');
      return;
    case 'down':
      logInfo('Stopping runtime stack...');
      runCompose(['down'], 'docker compose runtime down');
      logInfo('Runtime stack stopped.');
      return;
    case 'logs':
      runCompose(['logs', '-f'], 'docker compose runtime logs');
      return;
    case 'smoke':
      runSmokeSuite();
      return;
    case 'frontend-smoke':
      runFrontendSmokeSuite();
      return;
    case 'test-all':
      startRuntime(options);
      runSmokeSuite();
      if (!options.skipFrontendSmoke) {
        runFrontendSmokeSuite();
      }
      logInfo('Runtime deployment and smoke tests completed successfully.');
      return;
    case 'evidence':
      startRuntime(options);
      logInfo('Exporting standardized runtime evidence...');
      runNodeScript('scripts/qa/export_runtime_evidence.mjs', 'runtime evidence export');
      logInfo('Runtime evidence export completed successfully.');
      return;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

try {
  main();
} catch (error) {
  console.error(`[ERROR] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
