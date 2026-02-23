const request = require('supertest');
const { createApp } = require('../../dist/app');

const app = createApp();

async function run() {
    const payload = {
        pan: '4111111111111111',
        amount: 100,
        currency: '978',
        merchantId: 'SHOP001',
        posEntryMode: '051',
    };

    const first = await request(app)
        .post('/transaction/authorize')
        .set('x-student-id', 'ci-replay001-student')
        .send(payload);

    const second = await request(app)
        .post('/transaction/authorize')
        .set('x-student-id', 'ci-replay001-student')
        .send(payload);

    if (first.status !== 200 || second.status !== 200) {
        throw new Error(`REPLAY-001 bad statuses: first=${first.status} second=${second.status}`);
    }
    if (!second.body || !second.body.flag) {
        throw new Error(`REPLAY-001 flag missing: ${JSON.stringify(second.body)}`);
    }

    console.log('PASS REPLAY-001');
}

run()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error.message || error);
        process.exit(1);
    });
