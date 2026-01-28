/**
 * Atelier 5 : Outil de Dérivation de Clés
 * 
 * Démonstration de la dérivation de clés de session 
 * à partir d'une clé maître (simulation pédagogique).
 * 
 * Usage: node key-derivation-tool.js
 */

const crypto = require('crypto');

// Configuration
const CONFIG = {
    masterKey: '0123456789ABCDEF0123456789ABCDEF', // 32 hex = 128 bits (DEMO ONLY!)
    algorithm: 'aes-128-ecb',
    keyTypes: {
        ZPK: { purpose: 'PIN Encryption', prefix: 'PIN' },
        ZAK: { purpose: 'MAC Authentication', prefix: 'MAC' },
        ZEK: { purpose: 'Data Encryption', prefix: 'DAT' }
    }
};

/**
 * Calcule le Key Check Value (KCV)
 * @param {string} keyHex - Clé en hexadécimal
 * @returns {string} KCV (6 caractères hex)
 */
function calculateKCV(keyHex) {
    try {
        const key = Buffer.from(keyHex, 'hex');
        const zeros = Buffer.alloc(16, 0);

        const cipher = crypto.createCipheriv('aes-128-ecb', key, null);
        cipher.setAutoPadding(false);
        const encrypted = cipher.update(zeros);

        return encrypted.toString('hex').substring(0, 6).toUpperCase();
    } catch (e) {
        // Fallback
        return crypto.createHash('sha256').update(keyHex).digest('hex').substring(0, 6).toUpperCase();
    }
}

/**
 * Dérive une clé de session à partir de la clé maître
 * @param {string} masterKey - Clé maître en hex
 * @param {string} keyType - Type de clé (ZPK, ZAK, ZEK)
 * @param {string} sessionId - Identifiant de session unique
 * @returns {object} Clé dérivée avec métadonnées
 */
function deriveSessionKey(masterKey, keyType, sessionId) {
    const typeInfo = CONFIG.keyTypes[keyType];
    if (!typeInfo) {
        throw new Error(`Type de clé inconnu: ${keyType}`);
    }

    // Construction des données de dérivation
    const derivationData = `${typeInfo.prefix}:${sessionId}:${Date.now()}`;

    // HMAC pour la dérivation
    const derivedKeyFull = crypto.createHmac('sha256', Buffer.from(masterKey, 'hex'))
        .update(derivationData)
        .digest('hex');

    // Prendre les 32 premiers caractères (128 bits)
    const derivedKey = derivedKeyFull.substring(0, 32).toUpperCase();

    return {
        keyType,
        purpose: typeInfo.purpose,
        sessionId,
        key: derivedKey,
        kcv: calculateKCV(derivedKey),
        derivedAt: new Date().toISOString(),
        algorithm: 'HMAC-SHA256 → Truncate-128'
    };
}

/**
 * Affiche les informations d'une clé
 */
function displayKey(keyInfo, showFullKey = false) {
    console.log(`\n┌${'─'.repeat(58)}┐`);
    console.log(`│ ${keyInfo.keyType.padEnd(56)} │`);
    console.log(`├${'─'.repeat(58)}┤`);
    console.log(`│ Purpose:    ${keyInfo.purpose.padEnd(44)} │`);
    console.log(`│ Session:    ${keyInfo.sessionId.padEnd(44)} │`);

    if (showFullKey) {
        console.log(`│ Key:        ${keyInfo.key.padEnd(44)} │`);
    } else {
        const masked = keyInfo.key.substring(0, 8) + '...' + keyInfo.key.substring(24);
        console.log(`│ Key:        ${masked.padEnd(44)} │`);
    }

    console.log(`│ KCV:        ${keyInfo.kcv.padEnd(44)} │`);
    console.log(`│ Derived:    ${keyInfo.derivedAt.substring(0, 19).padEnd(44)} │`);
    console.log(`└${'─'.repeat(58)}┘`);
}

/**
 * Vérifie l'intégrité d'une clé via son KCV
 */
function verifyKey(keyHex, expectedKcv) {
    const actualKcv = calculateKCV(keyHex);
    const valid = actualKcv === expectedKcv.toUpperCase();

    return {
        valid,
        actualKcv,
        expectedKcv: expectedKcv.toUpperCase(),
        message: valid ? '✅ KCV valide - Clé intègre' : '❌ KCV invalide - Clé corrompue!'
    };
}

/**
 * Démonstration principale
 */
function demo() {
    console.log('═'.repeat(60));
    console.log('  🔑 OUTIL DE DÉRIVATION DE CLÉS - Atelier 5');
    console.log('═'.repeat(60));

    // Afficher la clé maître (masquée)
    console.log('\n📋 Clé Maître (ZMK):');
    console.log(`   Valeur: ${CONFIG.masterKey.substring(0, 8)}...${CONFIG.masterKey.substring(24)}`);
    console.log(`   KCV:    ${calculateKCV(CONFIG.masterKey)}`);
    console.log('   ⚠️  En production, cette clé est DANS le HSM !');

    // Générer un ID de session
    const sessionId = `SES-${Date.now().toString(36).toUpperCase()}`;
    console.log(`\n🔄 Session ID: ${sessionId}`);

    // Dériver les clés
    console.log('\n' + '─'.repeat(60));
    console.log('  DÉRIVATION DES CLÉS DE SESSION');
    console.log('─'.repeat(60));

    const derivedKeys = {};
    for (const keyType of Object.keys(CONFIG.keyTypes)) {
        derivedKeys[keyType] = deriveSessionKey(CONFIG.masterKey, keyType, sessionId);
        displayKey(derivedKeys[keyType], true); // showFullKey=true pour la démo
    }

    // Vérification KCV
    console.log('\n' + '─'.repeat(60));
    console.log('  VÉRIFICATION DES KCV');
    console.log('─'.repeat(60));

    for (const [type, keyInfo] of Object.entries(derivedKeys)) {
        const verification = verifyKey(keyInfo.key, keyInfo.kcv);
        console.log(`\n   ${type}: ${verification.message}`);
    }

    // Test avec KCV incorrect
    console.log('\n   Test avec KCV incorrect:');
    const badVerification = verifyKey(derivedKeys.ZPK.key, 'FFFFFF');
    console.log(`   ZPK: ${badVerification.message}`);

    console.log('\n' + '═'.repeat(60));
    console.log('  💡 POINTS CLÉS À RETENIR');
    console.log('═'.repeat(60));
    console.log(`
   1. La clé maître ne quitte JAMAIS le HSM
   2. Chaque session a des clés uniques
   3. Le KCV permet de vérifier sans exposer la clé
   4. L'algorithme de dérivation doit être cryptographiquement sûr
   5. Les clés dérivées héritent de la sécurité de la clé maître
`);
}

// Export pour utilisation externe
module.exports = {
    deriveSessionKey,
    calculateKCV,
    verifyKey
};

// Exécution
if (require.main === module) {
    demo();
}
