/**
 * Atelier 3 : Détecteur d'Attaque par Rejeu
 * 
 * Ce script simule une attaque par rejeu et démontre
 * comment un système de détection peut la bloquer.
 * 
 * Usage: npx ts-node replay-detector.ts
 */

import crypto from 'crypto';

// Simulation d'une transaction
interface Transaction {
    terminalId: string;
    stan: string;           // System Trace Audit Number
    rrn: string;            // Retrieval Reference Number
    pan: string;
    amount: number;
    timestamp: Date;
    mac: string;            // Message Authentication Code
}

// Cache pour la détection de rejeu (simule Redis)
const seenTransactions: Map<string, { timestamp: Date, count: number }> = new Map();

// Configuration
const CONFIG = {
    windowMs: 5 * 60 * 1000,    // 5 minutes
    maxDuplicates: 1,            // Maximum 1 (la première)
    secretKey: 'demo-secret-key-12345'
};

/**
 * Génère un identifiant unique pour une transaction
 */
function generateTransactionId(tx: Transaction): string {
    return `${tx.terminalId}-${tx.stan}-${tx.timestamp.toISOString().substring(0, 10)}`;
}

/**
 * Génère un MAC pour la transaction
 */
function generateMAC(tx: Transaction): string {
    const data = `${tx.terminalId}|${tx.stan}|${tx.pan}|${tx.amount}|${tx.timestamp.toISOString()}`;
    return crypto.createHmac('sha256', CONFIG.secretKey)
        .update(data)
        .digest('hex')
        .substring(0, 16)
        .toUpperCase();
}

/**
 * Vérifie si une transaction est un rejeu
 */
function detectReplay(tx: Transaction): { isReplay: boolean; reason?: string } {
    const txId = generateTransactionId(tx);

    // Vérifier si déjà vue
    if (seenTransactions.has(txId)) {
        const seen = seenTransactions.get(txId)!;
        const age = Date.now() - seen.timestamp.getTime();

        // Encore dans la fenêtre temporelle?
        if (age < CONFIG.windowMs) {
            seen.count++;
            return {
                isReplay: true,
                reason: `STAN ${tx.stan} déjà utilisé il y a ${Math.round(age / 1000)}s (tentative #${seen.count})`
            };
        }
    }

    // Enregistrer cette transaction
    seenTransactions.set(txId, {
        timestamp: new Date(),
        count: 1
    });

    return { isReplay: false };
}

/**
 * Nettoie les entrées expirées
 */
function cleanupExpired(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of seenTransactions.entries()) {
        if (now - value.timestamp.getTime() > CONFIG.windowMs) {
            seenTransactions.delete(key);
            cleaned++;
        }
    }

    return cleaned;
}

/**
 * Simule le traitement d'une transaction
 */
function processTransaction(tx: Transaction): { approved: boolean; message: string } {
    console.log(`\n📨 Transaction reçue:`);
    console.log(`   Terminal: ${tx.terminalId}`);
    console.log(`   STAN:     ${tx.stan}`);
    console.log(`   Montant:  ${tx.amount} EUR`);
    console.log(`   MAC:      ${tx.mac}`);

    // Vérifier le MAC
    const expectedMAC = generateMAC(tx);
    if (tx.mac !== expectedMAC) {
        console.log(`   ❌ MAC invalide!`);
        return { approved: false, message: 'MAC invalide' };
    }
    console.log(`   ✅ MAC valide`);

    // Vérifier le rejeu
    const replayCheck = detectReplay(tx);
    if (replayCheck.isReplay) {
        console.log(`   🚨 ATTAQUE PAR REJEU DÉTECTÉE!`);
        console.log(`   Raison: ${replayCheck.reason}`);
        return { approved: false, message: `Rejeu détecté: ${replayCheck.reason}` };
    }

    console.log(`   ✅ Transaction unique`);
    return { approved: true, message: 'Transaction approuvée' };
}

/**
 * Démonstration de l'attaque par rejeu
 */
function demonstrateReplayAttack(): void {
    console.log('═'.repeat(60));
    console.log('  🔥 SIMULATION: Attaque par Rejeu');
    console.log('═'.repeat(60));

    // Créer une transaction légitime
    const legitimateTx: Transaction = {
        terminalId: 'TERM0001',
        stan: '123456',
        rrn: '012345678901',
        pan: '4111111111111111',
        amount: 50.00,
        timestamp: new Date(),
        mac: ''
    };
    legitimateTx.mac = generateMAC(legitimateTx);

    console.log('\n📝 Étape 1: Transaction légitime');
    console.log('─'.repeat(60));
    const result1 = processTransaction(legitimateTx);
    console.log(`\n   Résultat: ${result1.approved ? '✅ APPROVED' : '❌ DECLINED'}`);

    console.log('\n📝 Étape 2: Première tentative de rejeu (immédiate)');
    console.log('─'.repeat(60));
    const result2 = processTransaction({ ...legitimateTx }); // Même transaction
    console.log(`\n   Résultat: ${result2.approved ? '✅ APPROVED' : '❌ DECLINED'}`);

    console.log('\n📝 Étape 3: Multiples tentatives de rejeu');
    console.log('─'.repeat(60));

    let approvedCount = 0;
    let rejectedCount = 0;

    for (let i = 0; i < 10; i++) {
        const result = processTransaction({ ...legitimateTx });
        if (result.approved) approvedCount++;
        else rejectedCount++;
    }

    console.log(`\n📊 Statistiques:`);
    console.log(`   Approuvées: ${approvedCount}`);
    console.log(`   Rejetées:   ${rejectedCount}`);
    console.log(`   Taux de blocage: ${Math.round((rejectedCount / 10) * 100)}%`);

    console.log('\n📝 Étape 4: Transaction avec nouveau STAN');
    console.log('─'.repeat(60));
    const newTx: Transaction = {
        ...legitimateTx,
        stan: '123457', // STAN différent
        timestamp: new Date(),
        mac: ''
    };
    newTx.mac = generateMAC(newTx);

    const result3 = processTransaction(newTx);
    console.log(`\n   Résultat: ${result3.approved ? '✅ APPROVED' : '❌ DECLINED'}`);

    console.log('\n' + '═'.repeat(60));
    console.log('  ✅ CONCLUSION: Le système anti-rejeu fonctionne!');
    console.log('═'.repeat(60));
    console.log('\n💡 Points clés:');
    console.log('   1. Chaque transaction a un identifiant unique (Terminal + STAN + Date)');
    console.log('   2. Le MAC empêche la modification des données');
    console.log('   3. Le cache temporel limite la fenêtre d\'attaque');
    console.log('   4. Un nouveau STAN est nécessaire pour chaque transaction\n');
}

// Exécuter la démonstration
demonstrateReplayAttack();
