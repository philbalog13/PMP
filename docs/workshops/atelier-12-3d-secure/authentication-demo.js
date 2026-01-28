/**
 * Atelier 12 : Démonstration 3D-Secure Authentication
 * 
 * Simule le processus d'authentification 3DS avec évaluation du risque.
 * 
 * Usage: node authentication-demo.js
 */

const crypto = require('crypto');

// Configuration 3DS
const CONFIG = {
    lowRiskThreshold: 30,
    mediumRiskThreshold: 60,
    highRiskThreshold: 80
};

// Base de données simulée
const knownDevices = new Set(['DEV-001', 'DEV-002']);
const knownMerchants = new Set(['MERCH-AMAZON', 'MERCH-FNAC']);
const cardHistory = {
    '4111111111111111': {
        avgAmount: 75,
        countries: ['FR', 'BE'],
        lastPurchase: Date.now() - 86400000
    }
};

/**
 * Évalue le risque d'une transaction
 */
function assessRisk(transaction) {
    let riskScore = 0;
    const factors = [];

    // Facteur 1: Nouveau device
    if (!knownDevices.has(transaction.deviceId)) {
        riskScore += 25;
        factors.push({ name: 'NEW_DEVICE', score: 25 });
    }

    // Facteur 2: Nouveau marchand
    if (!knownMerchants.has(transaction.merchantId)) {
        riskScore += 15;
        factors.push({ name: 'NEW_MERCHANT', score: 15 });
    }

    // Facteur 3: Montant anormal
    const history = cardHistory[transaction.pan];
    if (history && transaction.amount > history.avgAmount * 3) {
        riskScore += 30;
        factors.push({ name: 'HIGH_AMOUNT', score: 30 });
    }

    // Facteur 4: Nouveau pays
    if (history && !history.countries.includes(transaction.country)) {
        riskScore += 20;
        factors.push({ name: 'NEW_COUNTRY', score: 20 });
    }

    // Facteur 5: Première transaction
    if (!history) {
        riskScore += 35;
        factors.push({ name: 'NO_HISTORY', score: 35 });
    }

    // Facteur 6: Transaction nocturne (2h-5h)
    const hour = new Date().getHours();
    if (hour >= 2 && hour < 5) {
        riskScore += 10;
        factors.push({ name: 'NIGHT_TX', score: 10 });
    }

    return {
        score: Math.min(riskScore, 100),
        factors,
        decision: riskScore < CONFIG.lowRiskThreshold ? 'FRICTIONLESS' : 'CHALLENGE'
    };
}

/**
 * Génère un challenge approprié
 */
function generateChallenge(riskScore, transaction) {
    if (riskScore >= CONFIG.highRiskThreshold) {
        return {
            type: 'OTP_SMS',
            message: 'Entrez le code reçu par SMS',
            timeout: 180
        };
    } else if (riskScore >= CONFIG.mediumRiskThreshold) {
        return {
            type: 'BIOMETRIC',
            message: 'Validez avec votre empreinte',
            timeout: 60
        };
    } else {
        return {
            type: 'PUSH_NOTIFICATION',
            message: 'Confirmez dans votre app bancaire',
            timeout: 120
        };
    }
}

/**
 * Simule le processus complet 3DS
 */
function process3DS(transaction) {
    console.log('\n' + '─'.repeat(60));
    console.log('📋 Transaction reçue');
    console.log('─'.repeat(60));
    console.log(`   PAN: ****${transaction.pan.slice(-4)}`);
    console.log(`   Montant: ${transaction.amount} ${transaction.currency}`);
    console.log(`   Marchand: ${transaction.merchantId}`);
    console.log(`   Device: ${transaction.deviceId}`);
    console.log(`   Pays: ${transaction.country}`);

    // Étape 1: Évaluation du risque
    console.log('\n📊 Évaluation du risque...');
    const riskAssessment = assessRisk(transaction);

    console.log(`   Score: ${riskAssessment.score}/100`);
    console.log(`   Facteurs:`);
    riskAssessment.factors.forEach(f => {
        console.log(`     - ${f.name}: +${f.score}`);
    });

    // Étape 2: Décision
    console.log(`\n🎯 Décision: ${riskAssessment.decision}`);

    if (riskAssessment.decision === 'FRICTIONLESS') {
        console.log('   ✅ Authentification silencieuse réussie');
        return {
            authenticated: true,
            mode: 'FRICTIONLESS',
            transStatus: 'Y',
            eci: '05'
        };
    }

    // Étape 3: Challenge
    const challenge = generateChallenge(riskAssessment.score, transaction);
    console.log(`\n🔐 Challenge requis: ${challenge.type}`);
    console.log(`   Message: "${challenge.message}"`);
    console.log(`   Timeout: ${challenge.timeout}s`);

    // Simulation de réponse utilisateur (succès)
    console.log('\n👤 [Simulation] Utilisateur répond correctement...');

    return {
        authenticated: true,
        mode: 'CHALLENGE',
        challengeType: challenge.type,
        transStatus: 'Y',
        eci: '05'
    };
}

// Démonstration
function demo() {
    console.log('═'.repeat(60));
    console.log('  🔐 DÉMONSTRATION 3D-SECURE 2.0 - Atelier 12');
    console.log('═'.repeat(60));

    // Scénario 1: Transaction low-risk (frictionless)
    console.log('\n\n' + '▓'.repeat(60));
    console.log('  SCÉNARIO 1: Transaction habituelle (Low Risk)');
    console.log('▓'.repeat(60));

    const tx1 = {
        pan: '4111111111111111',
        amount: 45.00,
        currency: 'EUR',
        merchantId: 'MERCH-AMAZON',
        deviceId: 'DEV-001',
        country: 'FR'
    };
    const result1 = process3DS(tx1);
    console.log('\n📋 Résultat:', JSON.stringify(result1, null, 2));

    // Scénario 2: Transaction high-risk (challenge)
    console.log('\n\n' + '▓'.repeat(60));
    console.log('  SCÉNARIO 2: Nouveau device + montant élevé (High Risk)');
    console.log('▓'.repeat(60));

    const tx2 = {
        pan: '4111111111111111',
        amount: 850.00,
        currency: 'EUR',
        merchantId: 'MERCH-UNKNOWN',
        deviceId: 'DEV-NEW-999',
        country: 'DE'
    };
    const result2 = process3DS(tx2);
    console.log('\n📋 Résultat:', JSON.stringify(result2, null, 2));

    // Scénario 3: Première transaction
    console.log('\n\n' + '▓'.repeat(60));
    console.log('  SCÉNARIO 3: Première transaction (No History)');
    console.log('▓'.repeat(60));

    const tx3 = {
        pan: '5500000000000004',
        amount: 120.00,
        currency: 'EUR',
        merchantId: 'MERCH-FNAC',
        deviceId: 'DEV-002',
        country: 'FR'
    };
    const result3 = process3DS(tx3);
    console.log('\n📋 Résultat:', JSON.stringify(result3, null, 2));

    console.log('\n' + '═'.repeat(60));
    console.log('  💡 RÉSUMÉ DES MODES');
    console.log('═'.repeat(60));
    console.log(`
  FRICTIONLESS: Score < 30 → Aucune interaction utilisateur
  CHALLENGE:    Score ≥ 30 → Authentification requise
  
  Types de challenge selon le risque:
  - 30-60:  Push notification (moins intrusif)
  - 60-80:  Biométrie (équilibré)
  - 80-100: SMS OTP (plus sécurisé)
`);
}

demo();
