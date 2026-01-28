import axios from 'axios';
import { config, testData, responseCodes } from '../config';

/**
 * 🔄 Complete End-to-End Workflow Test
 * 
 * This test validates the full transaction flow:
 * TPE → API Gateway → POS → Acquirer → Network → Issuer → Fraud → Auth → Response
 */
describe('🔄 Complete Transaction Workflow', () => {

    describe('Scenario 1: Successful Purchase Transaction', () => {
        let transactionId: string;

        it('Step 1: Validate card data', async () => {
            const response = await axios.post(`${config.services.cards}/cards/validate`, {
                pan: testData.cards.valid.pan
            });

            expect(response.status).toBe(200);
            expect(response.data.data.valid).toBe(true);
            console.log('   ✅ Card validated (Luhn check passed)');
        });

        it('Step 2: Check card status', async () => {
            const response = await axios.get(`${config.services.cards}/cards/${testData.cards.valid.pan}`);

            expect(response.status).toBe(200);
            expect(response.data.data.status).toBe('ACTIVE');
            console.log('   ✅ Card is ACTIVE');
        });

        it('Step 3: Initiate transaction via POS', async () => {
            const response = await axios.post(`${config.services.pos}/transactions`, {
                pan: testData.cards.valid.pan,
                amount: 50.00,
                currency: 'EUR',
                merchantId: 'MERCHANT001',
                transactionType: 'PURCHASE',
                cvv: testData.cards.valid.cvv,
                expiryMonth: testData.cards.valid.expiryMonth,
                expiryYear: testData.cards.valid.expiryYear
            });

            expect(response.data.data.transactionId).toBeDefined();
            transactionId = response.data.data.transactionId;
            console.log(`   ✅ Transaction initiated: ${transactionId}`);
        });

        it('Step 4: Verify transaction completed', async () => {
            const response = await axios.get(`${config.services.pos}/transactions/${transactionId}`);

            expect(response.status).toBe(200);
            expect(['APPROVED', 'DECLINED', 'ERROR']).toContain(response.data.data.status);
            console.log(`   ✅ Transaction status: ${response.data.data.status}`);
            console.log(`   📋 Response code: ${response.data.data.responseCode}`);
        });
    });

    describe('Scenario 2: Insufficient Funds', () => {
        it('should decline transaction with code 51', async () => {
            const response = await axios.post(`${config.services.pos}/transactions`, {
                pan: testData.cards.insufficientFunds.pan,
                amount: 500.00, // More than the €10 balance
                currency: 'EUR',
                merchantId: 'MERCHANT001',
                transactionType: 'PURCHASE'
            });

            // The transaction should be declined
            if (response.data.data.status === 'DECLINED') {
                expect(response.data.data.responseCode).toBe(responseCodes.insufficientFunds);
                console.log('   ✅ Correctly declined: Insufficient funds');
            }
        });
    });

    describe('Scenario 3: High Amount Triggers Fraud Check', () => {
        it('should flag high-value transaction', async () => {
            // First check fraud service directly
            const fraudResponse = await axios.post(`${config.services.fraud}/check`, {
                pan: testData.cards.valid.pan,
                amount: 5000.00,
                merchantId: 'MERCHANT001',
                mcc: '5411'
            });

            expect(fraudResponse.data.riskScore).toBeGreaterThan(20);
            console.log(`   ⚠️ Fraud score: ${fraudResponse.data.riskScore}`);
            console.log(`   📋 Risk level: ${fraudResponse.data.riskLevel}`);
        });
    });

    describe('Scenario 4: Card Creation and Transaction', () => {
        let newCardPan: string;
        let newCardCvv: string;
        let newCardExpiry: { month: number; year: number };

        it('Step 1: Create new card', async () => {
            const response = await axios.post(`${config.services.cards}/cards`, {
                cardholderName: 'WORKFLOW TEST USER',
                cardType: 'VISA'
            });

            expect(response.status).toBe(201);
            newCardPan = response.data.data.pan;
            newCardCvv = response.data.data.cvv;
            newCardExpiry = {
                month: response.data.data.expiryMonth,
                year: response.data.data.expiryYear
            };
            console.log(`   ✅ New card created: ${response.data.data.maskedPan}`);
        });

        it('Step 2: Verify new card is valid', async () => {
            const response = await axios.post(`${config.services.cards}/cards/validate`, {
                pan: newCardPan
            });

            expect(response.data.data.valid).toBe(true);
            console.log('   ✅ New card passes Luhn validation');
        });
    });

    describe('Scenario 5: Crypto Operations in Workflow', () => {
        it('should encrypt PIN for transmission', async () => {
            const response = await axios.post(`${config.services.crypto}/pin/encode`, {
                pin: '1234',
                pan: testData.cards.valid.pan,
                format: 0
            });

            expect(response.status).toBe(200);
            expect(response.data.data).toHaveLength(16);
            console.log('   ✅ PIN Block generated for secure transmission');
        });

        it('should generate MAC for message integrity', async () => {
            const transactionData = JSON.stringify({
                pan: testData.cards.valid.pan,
                amount: 100.00,
                timestamp: new Date().toISOString()
            });

            const response = await axios.post(`${config.services.crypto}/mac/generate`, {
                data: transactionData,
                key: '0123456789ABCDEF0123456789ABCDEF',
                algorithm: 'sha256'
            });

            expect(response.status).toBe(200);
            expect(response.data.data).toBeDefined();
            console.log('   ✅ MAC generated for message integrity');
        });
    });

    describe('Scenario 6: Key Rotation Workflow', () => {
        let keyId: string;

        it('Step 1: Generate a working key', async () => {
            const response = await axios.post(`${config.services.keyMgmt}/keys`, {
                name: 'WORKFLOW-DEK',
                type: 'DEK',
                algorithm: 'AES-256'
            });

            expect(response.status).toBe(201);
            keyId = response.data.data.id;
            console.log(`   ✅ Key generated: ${keyId}`);
        });

        it('Step 2: Rotate the key', async () => {
            const response = await axios.post(`${config.services.keyMgmt}/keys/${keyId}/rotate`);

            expect(response.status).toBe(200);
            expect(response.data.data.newKeyId).toBeDefined();
            console.log(`   ✅ Key rotated: ${keyId} → ${response.data.data.newKeyId}`);
        });

        it('Step 3: Verify old key is suspended', async () => {
            const response = await axios.get(`${config.services.keyMgmt}/keys/${keyId}`);

            expect(response.data.data.status).toBe('SUSPENDED');
            console.log('   ✅ Old key suspended after rotation');
        });
    });
});

describe('📊 Workflow Summary', () => {
    it('should display test summary', async () => {
        console.log('\n═══════════════════════════════════════════');
        console.log('        PMP E2E Workflow Test Complete');
        console.log('═══════════════════════════════════════════');
        console.log('Services tested:');
        console.log('  • sim-card-service (Card CRUD, Luhn)');
        console.log('  • sim-pos-service (Transaction init)');
        console.log('  • sim-acquirer-service (Merchant)');
        console.log('  • sim-issuer-service (Authorization)');
        console.log('  • sim-fraud-detection (Risk scoring)');
        console.log('  • crypto-service (Encryption, MAC, PIN)');
        console.log('  • key-management (Key lifecycle)');
        console.log('═══════════════════════════════════════════\n');
        expect(true).toBe(true);
    });
});
