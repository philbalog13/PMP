/**
 * Scénario 2 : Correctif
 * Masking automatique et chiffrement des PAN dans les logs
 * 
 * Usage: node fix-pan-masking.js
 */

const crypto = require('crypto');

// Configuration de sécurité
const CONFIG = {
    encryptionAlgorithm: 'aes-256-gcm',
    maskFormat: '****',     // Format de masquage
    visibleDigits: 4,       // Derniers chiffres visibles
    binVisible: true,       // Afficher les 6 premiers chiffres (BIN)
    logRetentionDays: 365   // Durée de rétention
};

// Clé de chiffrement pour les logs (en prod: HSM)
const LOG_ENCRYPTION_KEY = crypto.randomBytes(32);

/**
 * Masque un PAN selon les règles PCI-DSS
 * Affiche: premiers 6 + **** + derniers 4
 */
function maskPAN(pan) {
    if (!pan || pan.length < 13) return pan;

    const cleanPan = pan.replace(/\D/g, '');

    if (CONFIG.binVisible) {
        // Format: 411111****1111
        const bin = cleanPan.substring(0, 6);
        const last4 = cleanPan.substring(cleanPan.length - 4);
        return `${bin}${CONFIG.maskFormat}${last4}`;
    } else {
        // Format: ****1111
        const last4 = cleanPan.substring(cleanPan.length - 4);
        return `${CONFIG.maskFormat}${last4}`;
    }
}

/**
 * Chiffre un PAN pour stockage sécurisé
 */
function encryptPAN(pan, key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(CONFIG.encryptionAlgorithm, key, iv);

    let encrypted = cipher.update(pan, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
        encrypted: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
    };
}

/**
 * Déchiffre un PAN (opération restreinte)
 */
function decryptPAN(encryptedData, key) {
    const decipher = crypto.createDecipheriv(
        CONFIG.encryptionAlgorithm,
        key,
        Buffer.from(encryptedData.iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Logger sécurisé qui masque automatiquement les PAN
 */
class SecureLogger {
    constructor(options = {}) {
        this.options = { ...CONFIG, ...options };
        this.encryptionKey = options.encryptionKey || LOG_ENCRYPTION_KEY;
    }

    /**
     * Détecte et masque les PAN dans un texte
     */
    sanitize(text) {
        if (typeof text !== 'string') {
            text = JSON.stringify(text);
        }

        // Patterns de PAN à détecter
        const panPatterns = [
            /\b4[0-9]{12}(?:[0-9]{3})?\b/g,           // Visa
            /\b5[1-5][0-9]{14}\b/g,                    // Mastercard
            /\b3[47][0-9]{13}\b/g,                     // Amex
            /\b6(?:011|5[0-9]{2})[0-9]{12}\b/g,        // Discover
        ];

        let sanitized = text;
        for (const pattern of panPatterns) {
            sanitized = sanitized.replace(pattern, (match) => {
                if (this.isValidPAN(match)) {
                    return maskPAN(match);
                }
                return match;
            });
        }

        return sanitized;
    }

    /**
     * Vérifie si un numéro passe le test de Luhn
     */
    isValidPAN(pan) {
        const digits = pan.replace(/\D/g, '').split('').reverse();
        let sum = 0;

        for (let i = 0; i < digits.length; i++) {
            let digit = parseInt(digits[i], 10);
            if (i % 2 === 1) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            sum += digit;
        }

        return sum % 10 === 0;
    }

    /**
     * Log un message en masquant les données sensibles
     */
    log(level, message, data = {}) {
        const timestamp = new Date().toISOString();
        const sanitizedMessage = this.sanitize(message);
        const sanitizedData = this.sanitize(JSON.stringify(data));

        const logEntry = {
            timestamp,
            level,
            message: sanitizedMessage,
            data: JSON.parse(sanitizedData)
        };

        console.log(JSON.stringify(logEntry));
        return logEntry;
    }

    info(message, data) { return this.log('INFO', message, data); }
    warn(message, data) { return this.log('WARN', message, data); }
    error(message, data) { return this.log('ERROR', message, data); }
    debug(message, data) { return this.log('DEBUG', message, data); }
}

/**
 * Middleware pour nettoyer les requêtes/réponses
 */
function sanitizationMiddleware(logger) {
    return function (req, res, next) {
        // Sauvegarder les méthodes originales
        const originalJson = res.json.bind(res);

        // Intercepter les réponses JSON
        res.json = function (data) {
            const sanitized = JSON.parse(logger.sanitize(JSON.stringify(data)));
            return originalJson(sanitized);
        };

        next();
    };
}

/**
 * Démonstration du correctif
 */
function demonstrateFix() {
    console.log('═'.repeat(60));
    console.log('  🔵 CORRECTIF : MASKING ET CHIFFREMENT PAN - Scénario 2');
    console.log('═'.repeat(60));

    const secureLogger = new SecureLogger();

    // Test 1: Masquage de PAN individuels
    console.log('\n📝 Test 1: Masquage de PAN');
    const testPans = [
        '4111111111111111',
        '5500000000000004',
        '340000000000009',
        '6011000000000004'
    ];

    for (const pan of testPans) {
        console.log(`   ${pan}${maskPAN(pan)}`);
    }

    // Test 2: Sanitization de texte contenant des PAN
    console.log('\n📝 Test 2: Sanitization de log');
    const unsafeLog = 'Transaction pour PAN: 4111111111111111, montant: 125.00 EUR';
    console.log(`   Avant: ${unsafeLog}`);
    console.log(`   Après: ${secureLogger.sanitize(unsafeLog)}`);

    // Test 3: Logger sécurisé
    console.log('\n📝 Test 3: Logger sécurisé');
    secureLogger.info('Paiement traité', {
        pan: '4111111111111111',
        amount: 125.00,
        status: 'APPROVED'
    });

    // Test 4: Chiffrement pour stockage
    console.log('\n📝 Test 4: Chiffrement pour archivage');
    const testPan = '4111111111111111';
    const encrypted = encryptPAN(testPan, LOG_ENCRYPTION_KEY);
    console.log(`   PAN original: ${testPan}`);
    console.log(`   Chiffré: ${encrypted.encrypted.substring(0, 20)}...`);
    console.log(`   IV: ${encrypted.iv.substring(0, 16)}...`);

    const decrypted = decryptPAN(encrypted, LOG_ENCRYPTION_KEY);
    console.log(`   Déchiffré: ${decrypted} ✅`);

    // Test 5: Données JSON
    console.log('\n📝 Test 5: Sanitization JSON');
    const jsonData = {
        transaction: {
            pan: '5500000000000004',
            cardNumber: '340000000000009'
        },
        message: 'Card 6011000000000004 approved'
    };
    console.log('   Avant:', JSON.stringify(jsonData));
    console.log('   Après:', secureLogger.sanitize(JSON.stringify(jsonData)));

    console.log('\n' + '─'.repeat(60));
    console.log('  💡 PROTECTION IMPLÉMENTÉE:');
    console.log('─'.repeat(60));
    console.log(`
  1. ✅ Masking automatique: 411111****1111
  2. ✅ Détection multi-patterns (Visa, MC, Amex, Discover)
  3. ✅ Validation Luhn avant masquage
  4. ✅ Chiffrement AES-256-GCM pour archivage
  5. ✅ Logger sécurisé drop-in replacement
  
  Les PAN ne sont PLUS JAMAIS stockés en clair.
`);
    console.log('═'.repeat(60) + '\n');
}

// Exécution
demonstrateFix();

module.exports = {
    maskPAN,
    encryptPAN,
    decryptPAN,
    SecureLogger,
    sanitizationMiddleware
};
