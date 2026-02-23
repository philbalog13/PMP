const request = require('supertest');
const app = require('../../dist/app').default;

async function run() {
    const first = await request(app).post('/auth/session-token').send({});
    if (first.status !== 200 || !first.body || !first.body.token) {
        throw new Error(`CRYPTO-001 step1 failed: status=${first.status}`);
    }

    const decoded = Buffer.from(first.body.token, 'base64').toString('utf8');
    const [tsStr, counterStr] = decoded.split(':');
    const counter = Number(counterStr);
    if (!Number.isFinite(counter)) {
        throw new Error(`CRYPTO-001 decode failed: token=${first.body.token}`);
    }

    const now = Math.floor(Date.now() / 1000);
    const candidateTokens = [now - 1, now, now + 1, Number(tsStr), Number(tsStr) + 1]
        .filter((value, index, arr) => Number.isFinite(value) && arr.indexOf(value) === index)
        .map((ts) => Buffer.from(`${ts}:${counter + 1}`).toString('base64'));

    let solved = false;
    let lastBody = null;
    for (const predictedToken of candidateTokens) {
        const response = await request(app)
            .post('/auth/session-token')
            .set('x-student-id', 'ci-crypto001-student')
            .send({ predictedToken });

        lastBody = response.body;
        if (response.status === 200 && response.body && response.body.flag) {
            solved = true;
            break;
        }
    }

    if (!solved) {
        throw new Error(`CRYPTO-001 flag missing. Last response=${JSON.stringify(lastBody)}`);
    }

    console.log('PASS CRYPTO-001');
}

run()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error.message || error);
        process.exit(1);
    });
