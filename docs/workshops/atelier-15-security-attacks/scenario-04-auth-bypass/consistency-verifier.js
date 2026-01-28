/**
 * Scénario 4 : Outil de Détection
 * Vérifie la cohérence entre requêtes et réponses d'autorisation
 * 
 * Usage: node consistency-verifier.js
 */

const crypto = require('crypto');

// Configuration
const CONFIG = {
    expectedApprovalRate: { min: 0.70, max: 0.95 },  // Taux normal
    maxResponseTimeMs: 5000,
    suspiciousPatterns: {
        authCodeChanges: true,
        responseCodeFlips: true,
        timingAnomalies: true
    }
};

// Base de données de transactions (simulation)
const transactionLog = [];
const requestResponsePairs = new Map();

/**
 * Enregistre une requête d'autorisation
 */
function logRequest(stan, request) {
    const entry = {
        stan,
        request,
        requestTime: Date.now(),
        response: null,
        responseTime: null,
        anomalies: []
    };
    requestResponsePairs.set(stan, entry);
    return entry;
}

/**
 * Enregistre une réponse et vérifie la cohérence
 */
function logResponse(stan, response) {
    const entry = requestResponsePairs.get(stan);

    if (!entry) {
        return {
            valid: false,
            anomaly: 'ORPHAN_RESPONSE',
            description: 'Réponse sans requête correspondante'
        };
    }

    entry.response = response;
    entry.responseTime = Date.now();

    // Vérifications de cohérence
    const anomalies = checkConsistency(entry);
    entry.anomalies = anomalies;

    transactionLog.push(entry);

    return {
        valid: anomalies.length === 0,
        anomalies
    };
}

/**
 * Vérifie la cohérence d'une paire requête/réponse
 */
function checkConsistency(entry) {
    const anomalies = [];
    const req = entry.request;
    const resp = entry.response;

    // 1. Vérifier que les champs clés correspondent
    if (req.pan !== resp.pan) {
        anomalies.push({
            type: 'PAN_MISMATCH',
            severity: 'CRITICAL',
            description: 'Le PAN de la réponse ne correspond pas à la requête'
        });
    }

    if (req.amount !== resp.amount) {
        anomalies.push({
            type: 'AMOUNT_MISMATCH',
            severity: 'CRITICAL',
            description: 'Le montant a été modifié entre requête et réponse'
        });
    }

    // 2. Vérifier le timing
    const responseTime = entry.responseTime - entry.requestTime;
    if (responseTime < 10) {  // Trop rapide = suspect
        anomalies.push({
            type: 'TIMING_ANOMALY',
            severity: 'HIGH',
            description: `Temps de réponse anormalement court: ${responseTime}ms`
        });
    }

    // 3. Vérifier la signature MAC
    if (resp.mac && !verifyResponseMAC(resp)) {
        anomalies.push({
            type: 'INVALID_MAC',
            severity: 'CRITICAL',
            description: 'MAC de la réponse invalide - possible modification'
        });
    }

    // 4. Vérifier les codes réponse suspects
    if (resp.responseCode === '00' && !resp.authCode) {
        anomalies.push({
            type: 'MISSING_AUTH_CODE',
            severity: 'HIGH',
            description: 'Transaction approuvée sans code autorisation'
        });
    }

    // 5. Détecter les auth codes suspects
    if (resp.authCode && (resp.authCode.startsWith('FAKE') ||
        resp.authCode.match(/^0{6}$/))) {
        anomalies.push({
            type: 'SUSPICIOUS_AUTH_CODE',
            severity: 'CRITICAL',
            description: `Code autorisation suspect: ${resp.authCode}`
        });
    }

    return anomalies;
}

/**
 * Vérifie le MAC d'une réponse (simulation)
 */
function verifyResponseMAC(response) {
    // En production: vérification cryptographique réelle
    return response.mac && response.mac !== 'INVALID';
}

/**
 * Analyse le taux d'approbation pour détecter des anomalies
 */
function analyzeApprovalRate() {
    const recent = transactionLog.slice(-100);
    if (recent.length < 10) return null;

    const approved = recent.filter(t => t.response?.responseCode === '00').length;
    const rate = approved / recent.length;

    const anomalies = [];

    if (rate > CONFIG.expectedApprovalRate.max) {
        anomalies.push({
            type: 'HIGH_APPROVAL_RATE',
            severity: 'HIGH',
            description: `Taux d'approbation anormalement élevé: ${(rate * 100).toFixed(1)}%`
        });
    }

    if (rate < CONFIG.expectedApprovalRate.min) {
        anomalies.push({
            type: 'LOW_APPROVAL_RATE',
            severity: 'MEDIUM',
            description: `Taux d'approbation anormalement bas: ${(rate * 100).toFixed(1)}%`
        });
    }

    return { rate, anomalies };
}

/**
 * Démonstration de la détection
 */
function demonstrateDetection() {
    console.log('═'.repeat(60));
    console.log('  🔍 DÉTECTION D\'AUTHORIZATION BYPASS - Scénario 4');
    console.log('═'.repeat(60));

    // Simuler des transactions normales
    console.log('\n📝 Simulation de transactions...\n');

    const testCases = [
        // Transaction normale (approuvée)
        {
            request: { stan: '000001', pan: '4111111111111111', amount: '10000' },
            response: {
                stan: '000001', pan: '4111111111111111', amount: '10000',
                responseCode: '00', authCode: 'ABC123', mac: 'VALID'
            },
            delay: 150
        },
        // Transaction normale (refusée)
        {
            request: { stan: '000002', pan: '5500000000000004', amount: '50000' },
            response: {
                stan: '000002', pan: '5500000000000004', amount: '50000',
                responseCode: '51', authCode: '', mac: 'VALID'
            },
            delay: 200
        },
        // 🚨 ATTAQUE: Montant modifié
        {
            request: { stan: '000003', pan: '340000000000009', amount: '100000' },
            response: {
                stan: '000003', pan: '340000000000009', amount: '10000',
                responseCode: '00', authCode: 'XYZ789', mac: 'VALID'
            },
            delay: 180
        },
        // 🚨 ATTAQUE: Auth code suspect
        {
            request: { stan: '000004', pan: '6011000000000004', amount: '25000' },
            response: {
                stan: '000004', pan: '6011000000000004', amount: '25000',
                responseCode: '00', authCode: 'FAKE01', mac: 'VALID'
            },
            delay: 5  // Trop rapide
        },
        // 🚨 ATTAQUE: MAC invalide
        {
            request: { stan: '000005', pan: '4222222222222222', amount: '30000' },
            response: {
                stan: '000005', pan: '4222222222222222', amount: '30000',
                responseCode: '00', authCode: 'DEF456', mac: 'INVALID'
            },
            delay: 100
        }
    ];

    for (const test of testCases) {
        // Enregistrer la requête
        logRequest(test.request.stan, test.request);

        // Simuler le délai
        // (en production: vrai timing)

        // Enregistrer la réponse et vérifier
        const result = logResponse(test.response.stan, test.response);

        console.log(`  STAN ${test.request.stan}:`);
        console.log(`    PAN: ****${test.request.pan.slice(-4)}`);
        console.log(`    Montant: ${parseInt(test.request.amount) / 100} EUR`);
        console.log(`    Réponse: ${test.response.responseCode} (${test.response.authCode || 'N/A'})`);

        if (result.valid) {
            console.log('    Status: ✅ Valide');
        } else {
            console.log('    Status: ❌ ANOMALIES DÉTECTÉES');
            result.anomalies.forEach(a => {
                console.log(`      ⚠️ [${a.severity}] ${a.type}: ${a.description}`);
            });
        }
        console.log();
    }

    // Résumé
    console.log('═'.repeat(60));
    console.log('  📊 RÉSUMÉ DE L\'ANALYSE');
    console.log('═'.repeat(60));

    const withAnomalies = transactionLog.filter(t => t.anomalies.length > 0);
    console.log(`\n  Transactions analysées: ${transactionLog.length}`);
    console.log(`  Transactions suspectes: ${withAnomalies.length}`);
    console.log(`  Taux de détection:      ${(withAnomalies.length / transactionLog.length * 100).toFixed(0)}%`);

    console.log('\n  Types d\'anomalies détectées:');
    const anomalyTypes = {};
    transactionLog.forEach(t => {
        t.anomalies.forEach(a => {
            anomalyTypes[a.type] = (anomalyTypes[a.type] || 0) + 1;
        });
    });
    Object.entries(anomalyTypes).forEach(([type, count]) => {
        console.log(`    ${type}: ${count}`);
    });

    console.log('═'.repeat(60) + '\n');
}

// Exécution
demonstrateDetection();

module.exports = { logRequest, logResponse, checkConsistency, analyzeApprovalRate };
