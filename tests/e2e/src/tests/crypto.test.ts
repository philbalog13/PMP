import axios from 'axios';
import { config } from '../config';

describe('🔐 Crypto Service Tests', () => {
    const cryptoUrl = config.services.crypto;
    const keyMgmtUrl = config.services.keyMgmt;

    describe('POST /encrypt & /decrypt', () => {
        const testKey = '0123456789ABCDEF0123456789ABCDEF'; // AES-256 key

        it('should encrypt and decrypt data', async () => {
            const plaintext = 'Hello PMP!';

            // Encrypt
            const encryptResponse = await axios.post(`${cryptoUrl}/encrypt`, {
                data: plaintext,
                key: testKey,
                algorithm: 'aes-256-cbc'
            });

            expect(encryptResponse.status).toBe(200);
            expect(encryptResponse.data.success).toBe(true);
            expect(encryptResponse.data.data).toBeDefined();

            const ciphertext = encryptResponse.data.data;

            // Decrypt
            const decryptResponse = await axios.post(`${cryptoUrl}/decrypt`, {
                data: ciphertext,
                key: testKey,
                algorithm: 'aes-256-cbc'
            });

            expect(decryptResponse.status).toBe(200);
            expect(decryptResponse.data.data).toBe(plaintext);
        });

        it('should show educational steps', async () => {
            const response = await axios.post(`${cryptoUrl}/encrypt`, {
                data: 'Test',
                key: testKey,
                algorithm: 'aes-256-cbc'
            });

            expect(response.data.steps).toBeDefined();
            expect(Array.isArray(response.data.steps)).toBe(true);
        });
    });

    describe('POST /mac/generate & /mac/verify', () => {
        const macKey = 'FEDCBA9876543210FEDCBA9876543210';

        it('should generate and verify MAC', async () => {
            const data = 'Important transaction data';

            // Generate MAC
            const generateResponse = await axios.post(`${cryptoUrl}/mac/generate`, {
                data,
                key: macKey,
                algorithm: 'sha256'
            });

            expect(generateResponse.status).toBe(200);
            const mac = generateResponse.data.data;

            // Verify MAC
            const verifyResponse = await axios.post(`${cryptoUrl}/mac/verify`, {
                data,
                mac,
                key: macKey,
                algorithm: 'sha256'
            });

            expect(verifyResponse.status).toBe(200);
            expect(verifyResponse.data.data).toBe('VALID');
        });

        it('should reject tampered data', async () => {
            const data = 'Original data';

            const generateResponse = await axios.post(`${cryptoUrl}/mac/generate`, {
                data,
                key: macKey
            });

            const mac = generateResponse.data.data;

            // Verify with modified data
            const verifyResponse = await axios.post(`${cryptoUrl}/mac/verify`, {
                data: 'Tampered data',
                mac,
                key: macKey
            });

            expect(verifyResponse.data.data).toBe('INVALID');
        });
    });

    describe('POST /pin/encode (ISO 9564)', () => {
        it('should generate PIN Block Format 0', async () => {
            const response = await axios.post(`${cryptoUrl}/pin/encode`, {
                pin: '1234',
                pan: '4111111111111111',
                format: 0
            });

            expect(response.status).toBe(200);
            expect(response.data.success).toBe(true);
            expect(response.data.data).toHaveLength(16);
        });

        it('should include educational PIN block info', async () => {
            const response = await axios.post(`${cryptoUrl}/pin/encode`, {
                pin: '1234',
                pan: '4111111111111111'
            });

            expect(response.data._educational).toBeDefined();
            expect(response.data._educational.standard).toContain('ISO 9564');
        });
    });

    describe('POST /cvv/generate', () => {
        it('should generate CVV', async () => {
            const response = await axios.post(`${cryptoUrl}/cvv/generate`, {
                pan: '4111111111111111',
                expiry: '1228',
                serviceCode: '101'
            });

            expect(response.status).toBe(200);
            expect(response.data.data).toHaveLength(3);
            expect(/^\d{3}$/.test(response.data.data)).toBe(true);
        });
    });

    describe('Key Management Service', () => {
        it('should list keys', async () => {
            const response = await axios.get(`${keyMgmtUrl}/keys`);
            expect(response.status).toBe(200);
            expect(Array.isArray(response.data.data)).toBe(true);
        });

        it('should generate new key', async () => {
            const response = await axios.post(`${keyMgmtUrl}/keys`, {
                name: 'E2E-TEST-KEY',
                type: 'DEK',
                algorithm: 'AES-256'
            });

            expect(response.status).toBe(201);
            expect(response.data.data.id).toBeDefined();
            expect(response.data.data.kcv).toBeDefined();
            expect(response.data.data.type).toBe('DEK');
        });

        it('should include educational key type info', async () => {
            const response = await axios.post(`${keyMgmtUrl}/keys`, {
                name: 'E2E-ZPK-KEY',
                type: 'ZPK',
                algorithm: 'AES-128'
            });

            expect(response.data._educational).toBeDefined();
            expect(response.data._educational.keyTypes).toBeDefined();
        });

        it('should rotate key', async () => {
            // Create a key
            const createResponse = await axios.post(`${keyMgmtUrl}/keys`, {
                name: 'ROTATE-TEST',
                type: 'DEK',
                algorithm: 'AES-256'
            });

            const keyId = createResponse.data.data.id;

            // Rotate it
            const rotateResponse = await axios.post(`${keyMgmtUrl}/keys/${keyId}/rotate`);

            expect(rotateResponse.status).toBe(200);
            expect(rotateResponse.data.data.newKeyId).toBeDefined();
            expect(rotateResponse.data.data.rotatedFrom).toBe(keyId);
        });
    });
});

