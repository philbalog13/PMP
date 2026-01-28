/**
 * Routes API pour les outils de débogage
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';

const router = Router();

// ISO 8583 Field Definitions
const ISO8583_FIELDS: Record<number, { name: string; type: string; length: number | string }> = {
    2: { name: 'PAN', type: 'n', length: '..19' },
    3: { name: 'Processing Code', type: 'n', length: 6 },
    4: { name: 'Amount', type: 'n', length: 12 },
    11: { name: 'STAN', type: 'n', length: 6 },
    12: { name: 'Local Time', type: 'n', length: 6 },
    13: { name: 'Local Date', type: 'n', length: 4 },
    14: { name: 'Expiry Date', type: 'n', length: 4 },
    22: { name: 'POS Entry Mode', type: 'n', length: 3 },
    23: { name: 'Card Sequence Number', type: 'n', length: 3 },
    25: { name: 'POS Condition Code', type: 'n', length: 2 },
    26: { name: 'POS PIN Capture Code', type: 'n', length: 2 },
    32: { name: 'Acquiring ID', type: 'n', length: '..11' },
    35: { name: 'Track 2 Data', type: 'z', length: '..37' },
    37: { name: 'Retrieval Reference', type: 'an', length: 12 },
    38: { name: 'Authorization Code', type: 'an', length: 6 },
    39: { name: 'Response Code', type: 'an', length: 2 },
    41: { name: 'Terminal ID', type: 'ans', length: 8 },
    42: { name: 'Merchant ID', type: 'ans', length: 15 },
    43: { name: 'Card Acceptor Name', type: 'ans', length: 40 },
    48: { name: 'Additional Data', type: 'ans', length: '..999' },
    49: { name: 'Currency Code', type: 'n', length: 3 },
    52: { name: 'PIN Data', type: 'b', length: 8 },
    55: { name: 'ICC Data', type: 'b', length: '..255' },
    64: { name: 'MAC', type: 'b', length: 8 }
};

// Transaction trace storage (simulation)
const transactionTraces = new Map<string, object>();

// GET /api/debug/trace/:id - Trace une transaction par ID
router.get('/trace/:id', async (req: Request, res: Response) => {
    const { id } = req.params;

    // Générer une trace simulée
    const trace = generateTransactionTrace(id);

    res.json({
        success: true,
        data: trace
    });
});

// POST /api/debug/decode - Décode un message ISO 8583
router.post('/decode', async (req: Request, res: Response) => {
    const { message, format = 'hex' } = req.body;

    try {
        const decoded = decodeISO8583(message, format);
        res.json({
            success: true,
            data: decoded
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// POST /api/debug/encode - Encode en message ISO 8583
router.post('/encode', async (req: Request, res: Response) => {
    const { fields, mti = '0100' } = req.body;

    try {
        const encoded = encodeISO8583(mti, fields);
        res.json({
            success: true,
            data: encoded
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// POST /api/debug/crypto - Analyse cryptographique étape par étape
router.post('/crypto', async (req: Request, res: Response) => {
    const { operation, data, key, algorithm = 'aes-256-cbc' } = req.body;

    try {
        const result = performCryptoDebug(operation, data, key, algorithm);
        res.json({
            success: true,
            data: result
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// GET /api/debug/performance - Données du profiler de performance
router.get('/performance', async (req: Request, res: Response) => {
    const performanceData = generatePerformanceProfile();

    res.json({
        success: true,
        data: performanceData
    });
});

// Fonctions helper

function generateTransactionTrace(txnId: string): object {
    const baseTime = Date.now();

    return {
        transactionId: txnId,
        status: 'completed',
        startTime: new Date(baseTime - 1500).toISOString(),
        endTime: new Date(baseTime).toISOString(),
        totalDuration: 1500,
        steps: [
            {
                id: 1,
                name: 'Request Received',
                service: 'Gateway',
                timestamp: new Date(baseTime - 1500).toISOString(),
                duration: 5,
                status: 'success',
                details: { source: 'TERM001', method: 'POST' }
            },
            {
                id: 2,
                name: 'Message Parsing',
                service: 'Switch',
                timestamp: new Date(baseTime - 1495).toISOString(),
                duration: 15,
                status: 'success',
                details: { mti: '0100', fields: 22 }
            },
            {
                id: 3,
                name: 'MAC Verification',
                service: 'HSM',
                timestamp: new Date(baseTime - 1480).toISOString(),
                duration: 45,
                status: 'success',
                details: { algorithm: 'ISO-9797-1-ALG3', valid: true }
            },
            {
                id: 4,
                name: 'PIN Verification',
                service: 'HSM',
                timestamp: new Date(baseTime - 1435).toISOString(),
                duration: 80,
                status: 'success',
                details: { pinBlockFormat: 'ISO-9564-1-FORMAT0', attempts: 1 }
            },
            {
                id: 5,
                name: 'Authorization Request',
                service: 'Auth Engine',
                timestamp: new Date(baseTime - 1355).toISOString(),
                duration: 850,
                status: 'success',
                details: { issuer: 'BNP', responseCode: '00' }
            },
            {
                id: 6,
                name: 'Response Generation',
                service: 'Switch',
                timestamp: new Date(baseTime - 505).toISOString(),
                duration: 25,
                status: 'success',
                details: { mti: '0110', authCode: 'ABC123' }
            },
            {
                id: 7,
                name: 'MAC Calculation',
                service: 'HSM',
                timestamp: new Date(baseTime - 480).toISOString(),
                duration: 40,
                status: 'success',
                details: { algorithm: 'ISO-9797-1-ALG3' }
            },
            {
                id: 8,
                name: 'Response Sent',
                service: 'Gateway',
                timestamp: new Date(baseTime - 440).toISOString(),
                duration: 10,
                status: 'success',
                details: { destination: 'TERM001' }
            }
        ],
        request: {
            mti: '0100',
            pan: '****1234',
            amount: 15000,
            currency: 'EUR',
            terminalId: 'TERM001'
        },
        response: {
            mti: '0110',
            responseCode: '00',
            authCode: 'ABC123'
        }
    };
}

function decodeISO8583(message: string, format: string): object {
    // Simulation du décodage
    const sampleDecoded = {
        mti: '0100',
        bitmap: 'F23C449128E18000',
        fields: {
            2: { value: '4111111111111111', name: 'PAN', masked: '****1111' },
            3: { value: '000000', name: 'Processing Code' },
            4: { value: '000000015000', name: 'Amount', formatted: '150.00 EUR' },
            11: { value: '123456', name: 'STAN' },
            12: { value: '143022', name: 'Local Time', formatted: '14:30:22' },
            13: { value: '0128', name: 'Local Date', formatted: '01/28' },
            22: { value: '051', name: 'POS Entry Mode', description: 'Chip read' },
            41: { value: 'TERM0001', name: 'Terminal ID' },
            42: { value: 'MERCHANT0000001', name: 'Merchant ID' },
            49: { value: '978', name: 'Currency Code', description: 'EUR' },
            52: { value: '****************', name: 'PIN Data', masked: true },
            64: { value: 'A1B2C3D4E5F6G7H8', name: 'MAC' }
        }
    };

    return {
        raw: message,
        format,
        decoded: sampleDecoded,
        validation: {
            luhnCheck: true,
            macValid: true,
            formatValid: true
        }
    };
}

function encodeISO8583(mti: string, fields: Record<number, string>): object {
    // Simulation de l'encodage
    const bitmap = calculateBitmap(Object.keys(fields).map(Number));

    return {
        mti,
        bitmap,
        fields,
        encoded: {
            hex: '30313030...' + crypto.randomBytes(50).toString('hex'),
            length: 256,
            format: 'ISO 8583:1987'
        }
    };
}

function calculateBitmap(fieldNumbers: number[]): string {
    let bitmap = BigInt(0);

    for (const field of fieldNumbers) {
        if (field >= 1 && field <= 64) {
            bitmap |= BigInt(1) << BigInt(64 - field);
        }
    }

    return bitmap.toString(16).padStart(16, '0').toUpperCase();
}

function performCryptoDebug(operation: string, data: string, key: string, algorithm: string): object {
    const steps: object[] = [];

    if (operation === 'encrypt') {
        steps.push({ step: 1, name: 'Input Data', value: data, type: 'plaintext' });
        steps.push({ step: 2, name: 'Key', value: key.substring(0, 8) + '...', type: 'key' });
        steps.push({ step: 3, name: 'Algorithm', value: algorithm, type: 'algorithm' });
        steps.push({ step: 4, name: 'IV Generation', value: crypto.randomBytes(16).toString('hex'), type: 'iv' });
        steps.push({ step: 5, name: 'Padding', value: 'PKCS7', type: 'padding' });
        steps.push({ step: 6, name: 'Encryption', value: 'CBC mode block cipher', type: 'operation' });
        steps.push({ step: 7, name: 'Output', value: crypto.randomBytes(32).toString('hex'), type: 'ciphertext' });
    } else if (operation === 'mac') {
        steps.push({ step: 1, name: 'Input Data', value: data, type: 'message' });
        steps.push({ step: 2, name: 'Key', value: key.substring(0, 8) + '...', type: 'key' });
        steps.push({ step: 3, name: 'Padding', value: 'ISO 9797-1 Method 2', type: 'padding' });
        steps.push({ step: 4, name: 'Initial Vector', value: '0000000000000000', type: 'iv' });
        steps.push({ step: 5, name: 'CBC-MAC Block 1', value: crypto.randomBytes(8).toString('hex'), type: 'intermediate' });
        steps.push({ step: 6, name: 'CBC-MAC Block 2', value: crypto.randomBytes(8).toString('hex'), type: 'intermediate' });
        steps.push({ step: 7, name: 'Final MAC', value: crypto.randomBytes(8).toString('hex'), type: 'mac' });
    } else if (operation === 'pin-block') {
        steps.push({ step: 1, name: 'Clear PIN', value: '****', type: 'pin' });
        steps.push({ step: 2, name: 'PAN', value: data, type: 'pan' });
        steps.push({ step: 3, name: 'Format', value: 'ISO 9564-1 Format 0', type: 'format' });
        steps.push({ step: 4, name: 'PIN Field', value: '04' + '****' + 'FFFFFFFFFF', type: 'intermediate' });
        steps.push({ step: 5, name: 'PAN Block', value: '0000' + data.substring(3, 15), type: 'intermediate' });
        steps.push({ step: 6, name: 'XOR Result', value: crypto.randomBytes(8).toString('hex'), type: 'intermediate' });
        steps.push({ step: 7, name: 'Encrypted PIN Block', value: crypto.randomBytes(8).toString('hex'), type: 'pinblock' });
    }

    return {
        operation,
        algorithm,
        steps,
        duration: Math.floor(Math.random() * 50) + 10,
        success: true
    };
}

function generatePerformanceProfile(): object {
    return {
        timestamp: new Date().toISOString(),
        cpu: {
            usage: Math.random() * 0.6 + 0.2,
            cores: 8,
            loadAvg: [1.5, 1.2, 0.9]
        },
        memory: {
            used: Math.floor(Math.random() * 4 * 1024 * 1024 * 1024),
            total: 16 * 1024 * 1024 * 1024,
            heapUsed: Math.floor(Math.random() * 500 * 1024 * 1024),
            heapTotal: 1024 * 1024 * 1024
        },
        services: [
            { name: 'Gateway', calls: 1250, avgLatency: 12, p99Latency: 45 },
            { name: 'Switch', calls: 1200, avgLatency: 25, p99Latency: 80 },
            { name: 'Auth Engine', calls: 1150, avgLatency: 85, p99Latency: 250 },
            { name: 'HSM', calls: 2300, avgLatency: 35, p99Latency: 90 },
            { name: 'Database', calls: 3500, avgLatency: 8, p99Latency: 30 }
        ],
        hotspots: [
            { function: 'AuthEngine.processAuthorization', time: 45, calls: 1150, percentage: 35 },
            { function: 'HSM.calculateMAC', time: 20, calls: 2300, percentage: 15 },
            { function: 'Switch.parseMessage', time: 15, calls: 1200, percentage: 12 },
            { function: 'Database.query', time: 12, calls: 3500, percentage: 10 },
            { function: 'HSM.verifyPIN', time: 18, calls: 1150, percentage: 14 }
        ]
    };
}

export default router;
