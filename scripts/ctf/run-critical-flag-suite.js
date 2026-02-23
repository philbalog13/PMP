const { spawnSync } = require('child_process');
const path = require('path');

function runStep(name, cwd, scriptRelativePath) {
    const scriptPath = path.join(cwd, scriptRelativePath);
    const result = spawnSync(process.execPath, [scriptPath], {
        cwd,
        stdio: 'inherit',
        env: process.env,
    });

    if (result.status !== 0) {
        throw new Error(`${name} failed with code ${result.status}`);
    }
}

function main() {
    const root = process.cwd();

    runStep(
        'CRYPTO-001',
        path.join(root, 'backend', 'api-gateway'),
        path.join('scripts', 'ctf', 'verify-crypto001.js')
    );

    runStep(
        'REPLAY-001',
        path.join(root, 'backend', 'sim-network-switch'),
        path.join('scripts', 'ctf', 'verify-replay001.js')
    );

    runStep(
        'REPLAY-002',
        path.join(root, 'backend', 'sim-fraud-detection'),
        path.join('scripts', 'ctf', 'verify-replay002.js')
    );

    console.log('PASS CTF critical flag suite');
}

try {
    main();
} catch (error) {
    console.error(error.message || error);
    process.exit(1);
}
