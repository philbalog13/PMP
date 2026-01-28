/**
 * Atelier 13 : Service de Tokenisation
 * 
 * Simule un Token Service Provider (TSP) avec vault sécurisé.
 * 
 * Usage: node tokenizer.js
 */

const crypto = require('crypto');

// Token Vault (simulation en mémoire)
const tokenVault = new Map();
const reverseVault = new Map(); // Token → PAN (pour détokenisation)

// Configuration
const CONFIG = {
    tokenBIN: '490000', // BIN spécial pour les tokens
    tokenLength: 16,
    merchantTokenPrefix: 'tok_'
};

/**
 * Génère un Payment Token (format 16 chiffres)
 */
function generatePaymentToken(pan, merchantId) {
    // Le token ressemble à un PAN mais avec un BIN différent
    const randomPart = crypto.randomBytes(5).toString('hex').substring(0, 9);
    const tokenBase = CONFIG.tokenBIN + randomPart;

    // Calculer le chiffre de Luhn pour avoir un "PAN" valide
    const checkDigit = calculateLuhnCheckDigit(tokenBase);
    const token = tokenBase + checkDigit;

    // Stocker le mapping
    const entry = {
        pan,
        token,
        merchantId,
        createdAt: new Date().toISOString(),
        status: 'ACTIVE'
    };

    tokenVault.set(token, entry);

    // Index inverse pour recherche par PAN
    if (!reverseVault.has(pan)) {
        reverseVault.set(pan, []);
    }
    reverseVault.get(pan).push(token);

    return token;
}

/**
 * Génère un Merchant Token (format tok_xxx)
 */
function generateMerchantToken(pan, merchantId) {
    const hash = crypto.createHash('sha256')
        .update(pan + merchantId + Date.now())
        .digest('hex')
        .substring(0, 24);

    const token = CONFIG.merchantTokenPrefix + hash;

    tokenVault.set(token, {
        pan,
        token,
        merchantId,
        createdAt: new Date().toISOString(),
        status: 'ACTIVE'
    });

    if (!reverseVault.has(pan)) {
        reverseVault.set(pan, []);
    }
    reverseVault.get(pan).push(token);

    return token;
}

/**
 * Calcule le chiffre de contrôle Luhn
 */
function calculateLuhnCheckDigit(number) {
    let sum = 0;
    let alternate = true;

    for (let i = number.length - 1; i >= 0; i--) {
        let digit = parseInt(number[i], 10);

        if (alternate) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }

        sum += digit;
        alternate = !alternate;
    }

    return ((10 - (sum % 10)) % 10).toString();
}

/**
 * Détokenise un token (récupère le PAN)
 * ATTENTION: Opération hautement sécurisée en production
 */
function detokenize(token) {
    const entry = tokenVault.get(token);

    if (!entry) {
        return { error: 'TOKEN_NOT_FOUND' };
    }

    if (entry.status !== 'ACTIVE') {
        return { error: 'TOKEN_REVOKED', status: entry.status };
    }

    return {
        pan: maskPan(entry.pan),
        panLast4: entry.pan.slice(-4),
        merchantId: entry.merchantId,
        createdAt: entry.createdAt
    };
}

/**
 * Révoque un token
 */
function revokeToken(token, reason = 'USER_REQUEST') {
    const entry = tokenVault.get(token);

    if (!entry) {
        return { success: false, error: 'TOKEN_NOT_FOUND' };
    }

    entry.status = 'REVOKED';
    entry.revokedAt = new Date().toISOString();
    entry.revokeReason = reason;

    return { success: true, message: 'Token revoked' };
}

/**
 * Masque un PAN (affiche uniquement les 4 derniers chiffres)
 */
function maskPan(pan) {
    return '****' + pan.slice(-4);
}

/**
 * Affiche le contenu du vault (pour debug)
 */
function displayVault() {
    console.log('\n┌' + '─'.repeat(68) + '┐');
    console.log('│' + '                      TOKEN VAULT                                '.padEnd(68) + '│');
    console.log('├' + '─'.repeat(68) + '┤');
    console.log('│ Token                        │ PAN      │ Merchant  │ Status     │');
    console.log('├' + '─'.repeat(68) + '┤');

    for (const [token, entry] of tokenVault) {
        const displayToken = token.length > 24 ? token.substring(0, 24) + '...' : token.padEnd(28);
        console.log(`│ ${displayToken} │ ${maskPan(entry.pan)} │ ${entry.merchantId.substring(0, 9).padEnd(9)} │ ${entry.status.padEnd(10)} │`);
    }

    console.log('└' + '─'.repeat(68) + '┘');
}

// Démonstration
function demo() {
    console.log('═'.repeat(60));
    console.log('  🔐 SERVICE DE TOKENISATION - Atelier 13');
    console.log('═'.repeat(60));

    // Test 1: Créer des Payment Tokens
    console.log('\n📝 Création de Payment Tokens:');
    const pan1 = '4111111111111111';
    const pan2 = '5500000000000004';

    const token1 = generatePaymentToken(pan1, 'AMAZON');
    console.log(`   ${maskPan(pan1)} → ${token1}`);

    const token2 = generatePaymentToken(pan1, 'NETFLIX'); // Même carte, autre marchand
    console.log(`   ${maskPan(pan1)} → ${token2} (autre marchand)`);

    const token3 = generatePaymentToken(pan2, 'AMAZON');
    console.log(`   ${maskPan(pan2)} → ${token3}`);

    // Test 2: Créer des Merchant Tokens
    console.log('\n📝 Création de Merchant Tokens:');
    const mToken1 = generateMerchantToken(pan1, 'SPOTIFY');
    console.log(`   ${maskPan(pan1)} → ${mToken1}`);

    // Afficher le vault
    displayVault();

    // Test 3: Détokenisation
    console.log('\n🔍 Détokenisation:');
    const result = detokenize(token1);
    console.log(`   Token: ${token1}`);
    console.log(`   → PAN: ${result.pan} (last4: ${result.panLast4})`);
    console.log(`   → Merchant: ${result.merchantId}`);

    // Test 4: Révocation
    console.log('\n🚫 Révocation:');
    const revokeResult = revokeToken(token2, 'FRAUD_DETECTED');
    console.log(`   Token ${token2} → ${revokeResult.message}`);

    // Test 5: Tentative de détokenisation après révocation
    console.log('\n🔍 Détokenisation après révocation:');
    const result2 = detokenize(token2);
    console.log(`   Token: ${token2}`);
    console.log(`   → Erreur: ${result2.error} (${result2.status})`);

    // Vault final
    displayVault();

    console.log('\n' + '═'.repeat(60));
    console.log('  💡 POINTS CLÉS');
    console.log('═'.repeat(60));
    console.log(`
  1. Le token remplace le PAN sensible
  2. Le mapping PAN ↔ Token est stocké dans un HSM
  3. Chaque marchand peut avoir son propre token pour le même PAN
  4. Les tokens peuvent être révoqués individuellement
  5. Réduction significative du scope PCI-DSS
`);
}

// Export pour utilisation externe
module.exports = {
    generatePaymentToken,
    generateMerchantToken,
    detokenize,
    revokeToken
};

// Exécution
if (require.main === module) {
    demo();
}
