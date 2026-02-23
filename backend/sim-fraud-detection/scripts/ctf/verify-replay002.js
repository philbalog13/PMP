const { spawn } = require('child_process');

async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
    const port = process.env.FRAUD_E2E_PORT || '18007';
    const child = spawn(process.execPath, ['dist/index.js'], {
        stdio: ['ignore', 'ignore', 'ignore'],
        env: { ...process.env, FRAUD_SERVICE_PORT: port },
    });

    const stopChild = () => {
        try {
            child.kill();
        } catch {
            // ignore
        }
    };

    try {
        await sleep(1800);

        const headers = {
            'content-type': 'application/json',
            'x-student-id': 'ci-replay002-student',
        };

        const payload = {
            pan: '4111111111111111',
            amount: 50,
            merchantId: 'SHOP001',
            mcc: '5411',
        };

        const postJson = async (path, body) => {
            const response = await fetch(`http://127.0.0.1:${port}${path}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
            });
            return { status: response.status, data: await response.json() };
        };

        let sawVelocity = false;
        for (let i = 0; i < 10; i++) {
            const check = await postJson('/fraud/check', payload);
            const reasons = Array.isArray(check.data?.reasons) ? check.data.reasons : [];
            if (reasons.some((reason) => String(reason).startsWith('Velocity:'))) {
                sawVelocity = true;
                break;
            }
        }

        if (!sawVelocity) {
            throw new Error('REPLAY-002 velocity threshold was not reached');
        }

        const reset = await postJson('/fraud/reset', {});
        if (reset.status !== 200) {
            throw new Error(`REPLAY-002 reset failed: ${reset.status}`);
        }

        const verify = await postJson('/fraud/check', payload);
        if (verify.status !== 200 || !verify.data?.flag) {
            throw new Error(`REPLAY-002 flag missing: ${JSON.stringify(verify.data)}`);
        }

        console.log('PASS REPLAY-002');
    } finally {
        stopChild();
        await sleep(300);
    }
}

run()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error.message || error);
        process.exit(1);
    });
