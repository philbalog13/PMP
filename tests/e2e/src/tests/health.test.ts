import axios from 'axios';
import { config } from '../config';

describe('🏥 Health Checks - All Services', () => {

    describe('API Gateway (8000)', () => {
        it('should return healthy status', async () => {
            const response = await axios.get(`${config.services.gateway}/health`);
            expect(response.status).toBe(200);
            expect(response.data.status).toBe('healthy');
            expect(response.data.service).toBe('api-gateway');
        });
    });

    describe('Card Service (8001)', () => {
        it('should return healthy status', async () => {
            const response = await axios.get(`${config.services.cards}/health`);
            expect(response.status).toBe(200);
            expect(response.data.status).toBe('healthy');
            expect(response.data.service).toBe('sim-card-service');
        });
    });

    describe('POS Service (8002)', () => {
        it('should return healthy status', async () => {
            const response = await axios.get(`${config.services.pos}/health`);
            expect(response.status).toBe(200);
            expect(response.data.status).toBe('healthy');
            expect(response.data.service).toBe('sim-pos-service');
        });
    });

    describe('Acquirer Service (8003)', () => {
        it('should return healthy status', async () => {
            const response = await axios.get(`${config.services.acquirer}/health`);
            expect(response.status).toBe(200);
            expect(response.data.status).toBe('healthy');
            expect(response.data.service).toBe('sim-acquirer-service');
        });
    });

    describe('Issuer Service (8005)', () => {
        it('should return healthy status', async () => {
            const response = await axios.get(`${config.services.issuer}/health`);
            expect(response.status).toBe(200);
            expect(response.data.status).toBe('healthy');
            expect(response.data.service).toBe('sim-issuer-service');
        });
    });

    describe('Fraud Detection (8007)', () => {
        it('should return healthy status', async () => {
            const response = await axios.get(`${config.services.fraud}/health`);
            expect(response.status).toBe(200);
            expect(response.data.status).toBe('healthy');
            expect(response.data.service).toBe('sim-fraud-detection');
        });
    });

    describe('Crypto Service (8010)', () => {
        it('should return healthy status', async () => {
            const response = await axios.get(`${config.services.crypto}/health`);
            expect(response.status).toBe(200);
            expect(response.data.status).toBe('healthy');
            expect(response.data.service).toBe('crypto-service');
        });
    });

    describe('Key Management (8012)', () => {
        it('should return healthy status', async () => {
            const response = await axios.get(`${config.services.keyMgmt}/health`);
            expect(response.status).toBe(200);
            expect(response.data.status).toBe('healthy');
            expect(response.data.service).toBe('key-management');
        });
    });

    describe('All Services Status Summary', () => {
        it('should check all services are running', async () => {
            const services = [
                { name: 'Gateway', url: config.services.gateway },
                { name: 'Cards', url: config.services.cards },
                { name: 'POS', url: config.services.pos },
                { name: 'Acquirer', url: config.services.acquirer },
                { name: 'Issuer', url: config.services.issuer },
                { name: 'Fraud', url: config.services.fraud },
                { name: 'Crypto', url: config.services.crypto },
                { name: 'KeyMgmt', url: config.services.keyMgmt }
            ];

            const results = await Promise.all(
                services.map(async (s) => {
                    try {
                        const r = await axios.get(`${s.url}/health`, { timeout: 5000 });
                        return { name: s.name, status: r.status === 200 ? '✅' : '❌' };
                    } catch {
                        return { name: s.name, status: '❌' };
                    }
                })
            );

            console.log('\n📊 Services Status:');
            results.forEach(r => console.log(`   ${r.status} ${r.name}`));

            const allHealthy = results.every(r => r.status === '✅');
            expect(allHealthy).toBe(true);
        });
    });
});
