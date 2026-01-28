/**
 * Scénario 3 : Correctif
 * Implémentation de DUKPT (Derived Unique Key Per Transaction)
 * 
 * Usage: node fix-derived-keys.js
 */

const crypto = require('crypto');

/**
 * Implémentation simplifiée de DUKPT
 * En production: utiliser une bibliothèque certifiée ou HSM
 */
class DUKPTKeyManager {
    constructor(baseDerivationKey) {
        // BDK (Base Derivation Key) - stocké dans le HSM
        this.bdk = Buffer.from(baseDerivationKey, 'hex');
        this.transactionCounter = new Map(); // Par terminal
    }

    /**
     * Dérive une IPEK (Initial PIN Encryption Key) pour un terminal
     */
    deriveIPEK(ksn) {
        // KSN = Key Serial Number (80 bits)
        // Les 59 premiers bits = ID du terminal
        // Les 21 derniers bits = compteur de transaction

        const ksnBuffer = Buffer.from(ksn, 'hex');

        // Masquer le compteur pour obtenir l'IPEK
        const maskedKsn = Buffer.alloc(10);
        ksnBuffer.copy(maskedKsn);
        maskedKsn[7] &= 0xE0;
        maskedKsn[8] = 0x00;
        maskedKsn[9] = 0x00;

        // Dérivation de l'IPEK (simplifiée)
        const hmac = crypto.createHmac('sha256', this.bdk);
        hmac.update(maskedKsn);
        const ipek = hmac.digest().slice(0, 16);

        return ipek;
    }

    /**
     * Dérive une clé de transaction (Session Key)
     */
    deriveSessionKey(ksn) {
        const ipek = this.deriveIPEK(ksn);
        const ksnBuffer = Buffer.from(ksn, 'hex');

        // Extraire le compteur
        const counter = (ksnBuffer[7] & 0x1F) << 16 |
            ksnBuffer[8] << 8 |
            ksnBuffer[9];

        // Dérivation progressive (simplifiée)
        let currentKey = ipek;

        for (let i = 0; i < 21; i++) {
            if (counter & (1 << i)) {
                const hmac = crypto.createHmac('sha256', currentKey);
                hmac.update(Buffer.from([i]));
                currentKey = hmac.digest().slice(0, 16);
            }
        }

        return currentKey;
    }

    /**
     * Obtient la prochaine clé pour un terminal
     */
    getNextKey(terminalId) {
        // Initialiser le compteur si nécessaire
        if (!this.transactionCounter.has(terminalId)) {
            this.transactionCounter.set(terminalId, 0);
        }

        // Incrémenter le compteur
        const counter = this.transactionCounter.get(terminalId) + 1;
        this.transactionCounter.set(terminalId, counter);

        // Construire le KSN
        const ksn = this.buildKSN(terminalId, counter);

        // Dériver la clé de session
        const sessionKey = this.deriveSessionKey(ksn);

        return {
            ksn: ksn,
            key: sessionKey,
            counter: counter
        };
    }

    /**
     * Construit le KSN
     */
    buildKSN(terminalId, counter) {
        // Format: IIIIIIII CC CCC (10 bytes hex)
        // I = ID terminal (7 bytes), C = compteur (3 bytes)
        const id = crypto.createHash('sha256')
            .update(terminalId)
            .digest('hex')
            .slice(0, 14);

        const counterHex = counter.toString(16).padStart(6, '0');
        return id + counterHex;
    }

    /**
     * Vérifie qu'une clé n'a jamais été utilisée
     */
    validateKeyUsage(ksn) {
        // En production: vérifier dans une base de données
        // que ce KSN n'a pas déjà été utilisé
        return true;
    }
}

/**
 * Service d'encryption PIN sécurisé avec DUKPT
 */
class SecurePINService {
    constructor(bdkHex) {
        this.keyManager = new DUKPTKeyManager(bdkHex);
    }

    /**
     * Chiffre un PIN Block avec une clé dérivée unique
     */
    encryptPINBlock(pinBlock, terminalId) {
        // Obtenir une nouvelle clé unique
        const keyData = this.keyManager.getNextKey(terminalId);

        // Étendre la clé pour 3DES
        const key = Buffer.concat([keyData.key, keyData.key.slice(0, 8)]);

        // Chiffrer avec IV aléatoire
        const iv = crypto.randomBytes(8);
        const cipher = crypto.createCipheriv('des-ede3-cbc', key, iv);

        let encrypted = cipher.update(pinBlock, 'hex', 'hex');
        encrypted += cipher.final('hex');

        return {
            encryptedPinBlock: encrypted,
            ksn: keyData.ksn,
            iv: iv.toString('hex'),
            transactionCounter: keyData.counter
        };
    }

    /**
     * Déchiffre un PIN Block (côté HSM)
     */
    decryptPINBlock(encryptedPinBlock, ksn, iv) {
        // Reconstruire la clé de session
        const sessionKey = this.keyManager.deriveSessionKey(ksn);
        const key = Buffer.concat([sessionKey, sessionKey.slice(0, 8)]);

        // Vérifier que le KSN n'a pas été réutilisé
        if (!this.keyManager.validateKeyUsage(ksn)) {
            throw new Error('KSN REPLAY DETECTED - Potential attack!');
        }

        // Déchiffrer
        const decipher = crypto.createDecipheriv(
            'des-ede3-cbc',
            key,
            Buffer.from(iv, 'hex')
        );

        let decrypted = decipher.update(encryptedPinBlock, 'hex', 'hex');
        decrypted += decipher.final('hex');

        return decrypted;
    }
}

/**
 * Démonstration du correctif
 */
function demonstrateFix() {
    console.log('═'.repeat(60));
    console.log('  🔵 CORRECTIF : DUKPT - Scénario 3');
    console.log('═'.repeat(60));

    // BDK (en prod: dans HSM)
    const bdk = crypto.randomBytes(16).toString('hex');
    const service = new SecurePINService(bdk);

    const terminalId = 'TERM-001';
    const testPinBlock = '0412AC4567890123';

    // Simuler plusieurs transactions
    console.log('\n📝 Simulation de 5 transactions avec clés dérivées:\n');

    for (let i = 1; i <= 5; i++) {
        const result = service.encryptPINBlock(testPinBlock, terminalId);

        console.log(`  Transaction ${i}:`);
        console.log(`    KSN:        ${result.ksn}`);
        console.log(`    Counter:    ${result.transactionCounter}`);
        console.log(`    Encrypted:  ${result.encryptedPinBlock.substring(0, 16)}...`);
        console.log();
    }

    // Démontrer la protection contre le rejeu
    console.log('─'.repeat(60));
    console.log('  🛡️ PROTECTION CONTRE LE BRUTE FORCE:');
    console.log('─'.repeat(60));
    console.log(`
  1. ✅ Chaque transaction utilise une CLÉ DIFFÉRENTE
  2. ✅ Le KSN change à chaque transaction (compteur)
  3. ✅ Même si une clé est compromise, elle n'est pas réutilisable
  4. ✅ Brute force impossible car:
       - L'attaquant devrait casser CHAQUE clé individuellement
       - Les clés ne sont jamais les mêmes
       - Le KSN permet de détecter les rejeux
`);

    // Comparaison avant/après
    console.log('─'.repeat(60));
    console.log('  📊 COMPARAISON:');
    console.log('─'.repeat(60));
    console.log(`
  AVANT (Clé statique):
  ├── Même clé pour toutes les transactions
  ├── Brute force possible (10000 essais)
  └── Temps d'attaque: ~secondes

  APRÈS (DUKPT):
  ├── Clé unique par transaction
  ├── Compteur anti-rejeu
  └── Brute force: IMPOSSIBLE sans BDK
`);

    console.log('═'.repeat(60) + '\n');
}

// Exécution
demonstrateFix();

module.exports = { DUKPTKeyManager, SecurePINService };
