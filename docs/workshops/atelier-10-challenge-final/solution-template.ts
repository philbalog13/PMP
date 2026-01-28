/**
 * Atelier 10 : Challenge Final - Template de Solution
 * 
 * Complétez les fonctions TODO pour créer un processeur de transactions complet.
 * 
 * Usage: npx ts-node solution-template.ts
 */

import crypto from 'crypto';

// ============================================================
// TYPES
// ============================================================

interface TransactionRequest {
    terminalId: string;
    merchantId: string;
    pan: string;
    pin: string;
    amount: number;
    currency: string;
}

interface TransactionResponse {
    approved: boolean;
    responseCode: string;
    authCode?: string;
    stan: string;
    timestamp: string;
    fraudScore: number;
    message: string;
}

interface AuditLog {
    timestamp: string;
    step: string;
    status: 'SUCCESS' | 'FAILED';
    details: Record<string, unknown>;
}

// ============================================================
// CONFIGURATION
// ============================================================

const CONFIG = {
    zpk: '0123456789ABCDEF0123456789ABCDEF',
    macKey: 'FEDCBA9876543210FEDCBA9876543210',
    velocityLimit: 5,
    velocityWindowMs: 10 * 60 * 1000,
    replayWindowMs: 5 * 60 * 1000,
    fraudThreshold: 80
};

// Cache pour anti-rejeu et velocity
const seenTransactions = new Map<string, Date>();
const cardTransactions = new Map<string, Date[]>();
const logs: AuditLog[] = [];

// ============================================================
// UTILITAIRES
// ============================================================

function log(step: string, status: 'SUCCESS' | 'FAILED', details: Record<string, unknown>): void {
    const entry: AuditLog = {
        timestamp: new Date().toISOString(),
        step,
        status,
        details
    };
    logs.push(entry);
    console.log(`[${entry.timestamp}] ${status === 'SUCCESS' ? '✅' : '❌'} ${step}`, JSON.stringify(details));
}

function generateSTAN(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateAuthCode(): string {
    return 'A' + Math.floor(10000 + Math.random() * 90000).toString();
}

// ============================================================
// TODO: IMPLÉMENTER CES FONCTIONS
// ============================================================

/**
 * TODO 1: Valider le numéro de carte avec l'algorithme de Luhn
 */
function validateLuhn(pan: string): boolean {
    // HINT: Implémentez l'algorithme de Luhn
    // 1. Doubler chaque 2ème chiffre en partant de la droite
    // 2. Si > 9, soustraire 9
    // 3. La somme totale doit être divisible par 10

    let sum = 0;
    let alternate = false;

    for (let i = pan.length - 1; i >= 0; i--) {
        let digit = parseInt(pan[i], 10);

        if (alternate) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }

        sum += digit;
        alternate = !alternate;
    }

    return sum % 10 === 0;
}

/**
 * TODO 2: Générer un PIN Block Format 0
 */
function generatePinBlock(pin: string, pan: string): string {
    // HINT: Voir Atelier 2
    // 1. Construire bloc PIN: Format(0) + Length + PIN + padding(F)
    // 2. Construire bloc PAN: 0000 + 12 derniers chiffres (sans check digit)
    // 3. XOR les deux blocs

    const pinLength = pin.length.toString(16).toUpperCase();
    const pinPadded = pin.padEnd(14, 'F');
    const pinBlock = '0' + pinLength + pinPadded;

    const panDigits = pan.substring(3, 15);
    const panBlock = '0000' + panDigits;

    let result = '';
    for (let i = 0; i < 16; i++) {
        const a = parseInt(pinBlock[i], 16);
        const b = parseInt(panBlock[i], 16);
        result += (a ^ b).toString(16).toUpperCase();
    }

    return result;
}

/**
 * TODO 3: Générer un MAC
 */
function generateMAC(data: string, key: string): string {
    // HINT: Voir Atelier 7
    return crypto.createHmac('sha256', key)
        .update(data)
        .digest('hex')
        .substring(0, 16)
        .toUpperCase();
}

/**
 * TODO 4: Vérifier le velocity (max transactions par fenêtre)
 */
function checkVelocity(pan: string): boolean {
    // HINT: Voir Atelier 4
    const now = Date.now();
    const recent = cardTransactions.get(pan) || [];

    // Nettoyer les vieilles entrées
    const filtered = recent.filter(date => now - date.getTime() < CONFIG.velocityWindowMs);

    // Vérifier la limite
    if (filtered.length >= CONFIG.velocityLimit) {
        return false;
    }

    // Enregistrer cette transaction
    filtered.push(new Date());
    cardTransactions.set(pan, filtered);

    return true;
}

/**
 * TODO 5: Détecter les rejeux
 */
function checkReplay(terminalId: string, stan: string): boolean {
    // HINT: Voir Atelier 3
    const key = `${terminalId}-${stan}-${new Date().toISOString().substring(0, 10)}`;

    if (seenTransactions.has(key)) {
        const seen = seenTransactions.get(key)!;
        if (Date.now() - seen.getTime() < CONFIG.replayWindowMs) {
            return false; // Rejeu détecté
        }
    }

    seenTransactions.set(key, new Date());
    return true;
}

/**
 * TODO 6: Calculer le score de fraude
 */
function calculateFraudScore(request: TransactionRequest): number {
    // HINT: Voir Atelier 4
    let score = 0;

    // Montant élevé
    if (request.amount > 1000) score += 20;
    if (request.amount > 5000) score += 30;

    // TODO: Ajouter d'autres règles...

    return Math.min(score, 100);
}

// ============================================================
// PROCESSEUR PRINCIPAL
// ============================================================

function processTransaction(request: TransactionRequest): TransactionResponse {
    const stan = generateSTAN();
    const timestamp = new Date().toISOString();

    log('RECEIVE_REQUEST', 'SUCCESS', { terminal: request.terminalId, amount: request.amount });

    // Étape 1: Validation Luhn
    if (!validateLuhn(request.pan)) {
        log('VALIDATE_LUHN', 'FAILED', { pan: request.pan.substring(0, 4) + '****' });
        return { approved: false, responseCode: '14', stan, timestamp, fraudScore: 0, message: 'Numéro de carte invalide' };
    }
    log('VALIDATE_LUHN', 'SUCCESS', {});

    // Étape 2: Anti-rejeu
    if (!checkReplay(request.terminalId, stan)) {
        log('CHECK_REPLAY', 'FAILED', { stan });
        return { approved: false, responseCode: '94', stan, timestamp, fraudScore: 0, message: 'Transaction en double' };
    }
    log('CHECK_REPLAY', 'SUCCESS', {});

    // Étape 3: Velocity
    if (!checkVelocity(request.pan)) {
        log('CHECK_VELOCITY', 'FAILED', {});
        return { approved: false, responseCode: '65', stan, timestamp, fraudScore: 100, message: 'Trop de transactions' };
    }
    log('CHECK_VELOCITY', 'SUCCESS', {});

    // Étape 4: Score de fraude
    const fraudScore = calculateFraudScore(request);
    if (fraudScore >= CONFIG.fraudThreshold) {
        log('CHECK_FRAUD', 'FAILED', { score: fraudScore });
        return { approved: false, responseCode: '59', stan, timestamp, fraudScore, message: 'Suspicion de fraude' };
    }
    log('CHECK_FRAUD', 'SUCCESS', { score: fraudScore });

    // Étape 5: Génération PIN Block
    const pinBlock = generatePinBlock(request.pin, request.pan);
    log('GENERATE_PIN_BLOCK', 'SUCCESS', { pinBlock: pinBlock.substring(0, 4) + '****' });

    // Étape 6: Génération MAC
    const messageData = `${request.terminalId}|${request.pan}|${request.amount}|${stan}`;
    const mac = generateMAC(messageData, CONFIG.macKey);
    log('GENERATE_MAC', 'SUCCESS', { mac });

    // Étape 7: Autorisation
    const authCode = generateAuthCode();
    log('AUTHORIZE', 'SUCCESS', { authCode });

    return {
        approved: true,
        responseCode: '00',
        authCode,
        stan,
        timestamp,
        fraudScore,
        message: 'Transaction approuvée'
    };
}

// ============================================================
// DÉMONSTRATION
// ============================================================

function demo(): void {
    console.log('═'.repeat(60));
    console.log('  🏆 CHALLENGE FINAL - Processeur de Transactions');
    console.log('═'.repeat(60));

    const testCases: TransactionRequest[] = [
        { terminalId: 'TERM001', merchantId: 'MERCH001', pan: '4111111111111111', pin: '1234', amount: 50.00, currency: 'EUR' },
        { terminalId: 'TERM001', merchantId: 'MERCH001', pan: '4111111111111112', pin: '5678', amount: 25.00, currency: 'EUR' }, // Luhn invalid
        { terminalId: 'TERM001', merchantId: 'MERCH001', pan: '4111111111111111', pin: '1234', amount: 7500.00, currency: 'EUR' }, // High amount
    ];

    for (const testCase of testCases) {
        console.log('\n' + '─'.repeat(60));
        console.log(`📨 Transaction: ${testCase.pan.substring(0, 4)}**** | ${testCase.amount}€`);
        console.log('─'.repeat(60));

        const result = processTransaction(testCase);

        console.log('\n📋 Résultat:');
        console.log(`   ${result.approved ? '✅ APPROVED' : '❌ DECLINED'}`);
        console.log(`   Code: ${result.responseCode} | ${result.message}`);
        console.log(`   STAN: ${result.stan} | Fraud Score: ${result.fraudScore}`);
        if (result.authCode) console.log(`   Auth: ${result.authCode}`);
    }

    console.log('\n' + '═'.repeat(60));
    console.log('  📊 AUDIT LOG SUMMARY');
    console.log('═'.repeat(60));
    console.log(`   Total entries: ${logs.length}`);
    console.log(`   Success: ${logs.filter(l => l.status === 'SUCCESS').length}`);
    console.log(`   Failed: ${logs.filter(l => l.status === 'FAILED').length}`);
}

demo();
