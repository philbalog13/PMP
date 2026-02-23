const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function runNodeScript(scriptPath) {
    const startedAt = Date.now();
    const result = spawnSync(process.execPath, [scriptPath], {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: process.env,
    });
    const durationMs = Date.now() - startedAt;

    return {
        script: scriptPath,
        status: result.status === 0 ? 'PASS' : 'FAIL',
        exitCode: result.status,
        durationMs,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
    };
}

function main() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.join('test-results', 'ctf');
    const outputPath = path.join(outputDir, `nightly-smoke-${timestamp}.json`);

    fs.mkdirSync(outputDir, { recursive: true });

    const checks = [
        runNodeScript(path.join('scripts', 'ctf', 'check-solvability-matrix.js')),
        runNodeScript(path.join('scripts', 'ctf', 'run-critical-flag-suite.js')),
    ];

    const status = checks.every((check) => check.status === 'PASS') ? 'PASS' : 'FAIL';
    const report = {
        suite: 'ctf-nightly-smoke',
        status,
        timestamp: new Date().toISOString(),
        checks,
    };

    fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(`Nightly smoke report written: ${outputPath}`);

    if (status !== 'PASS') {
        process.exit(1);
    }
}

try {
    main();
} catch (error) {
    console.error(error.message || error);
    process.exit(1);
}
