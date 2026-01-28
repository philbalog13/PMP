/**
 * Atelier 7 : Générateur de MAC
 * 
 * Implémentation de HMAC pour garantir l'intégrité des messages.
 * Usage: node mac-generator.js
 */

const crypto = require('crypto');

const CONFIG = {
    algorithm: 'sha256',
    keyLength: 32,
    macLength: 16  // Tronquer à 16 hex (64 bits) pour ISO 9797-1
};

/**
 * Génère un MAC HMAC-SHA256
 */
function generateMAC(message, key) {
    const hmac = crypto.createHmac(CONFIG.algorithm, key);
    hmac.update(message);
    return hmac.digest('hex').substring(0, CONFIG.macLength).toUpperCase();
}

/**
 * Vérifie un MAC
 */
function verifyMAC(message, key, expectedMac) {
    const actualMac = generateMAC(message, key);
    const valid = actualMac === expectedMac.toUpperCase();
    return { valid, actualMac, expectedMac: expectedMac.toUpperCase() };
}

/**
 * Génère une clé aléatoire
 */
function generateKey() {
    return crypto.randomBytes(CONFIG.keyLength).toString('hex').toUpperCase();
}

/**
 * Crée un message de transaction pour les tests
 */
function createTestMessage(data) {
    return `${data.mti}|${data.pan}|${data.amount}|${data.stan}|${data.timestamp}`;
}

// Démonstration
function demo() {
    console.log('═'.repeat(60));
    console.log('  🔐 GÉNÉRATEUR DE MAC - Atelier 7');
    console.log('═'.repeat(60));

    // Générer une clé
    const key = generateKey();
    console.log(`\n🔑 Clé MAC (ZAK): ${key.substring(0, 16)}...`);

    // Message de test
    const txData = {
        mti: '0100',
        pan: '4111111111111111',
        amount: '000000005000',
        stan: '123456',
        timestamp: new Date().toISOString()
    };

    const message = createTestMessage(txData);
    console.log(`\n📨 Message: ${message}`);

    // Générer MAC
    const mac = generateMAC(message, key);
    console.log(`\n✅ MAC généré: ${mac}`);

    // Vérification valide
    console.log('\n' + '─'.repeat(60));
    console.log('Test 1: Vérification du message original');
    const result1 = verifyMAC(message, key, mac);
    console.log(`   Résultat: ${result1.valid ? '✅ VALIDE' : '❌ INVALIDE'}`);

    // Vérification avec message altéré
    console.log('\n' + '─'.repeat(60));
    console.log('Test 2: Message avec montant modifié (5000 → 50000)');
    const alteredMessage = message.replace('000000005000', '000000050000');
    const result2 = verifyMAC(alteredMessage, key, mac);
    console.log(`   Résultat: ${result2.valid ? '✅ VALIDE' : '❌ INVALIDE'}`);
    console.log(`   MAC attendu: ${mac}`);
    console.log(`   MAC calculé: ${result2.actualMac}`);

    // Vérification avec mauvaise clé
    console.log('\n' + '─'.repeat(60));
    console.log('Test 3: Message original avec mauvaise clé');
    const wrongKey = generateKey();
    const result3 = verifyMAC(message, wrongKey, mac);
    console.log(`   Résultat: ${result3.valid ? '✅ VALIDE' : '❌ INVALIDE'}`);

    console.log('\n' + '═'.repeat(60));
    console.log('  💡 Le MAC change complètement si le message est modifié');
    console.log('═'.repeat(60) + '\n');
}

module.exports = { generateMAC, verifyMAC, generateKey };
if (require.main === module) demo();
