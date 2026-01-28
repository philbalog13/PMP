/**
 * Scénario 1 : Correctif
 * Implémentation du MAC obligatoire sur tous les champs critiques
 * 
 * Usage: node fix-mac-mandatory.js
 */

const crypto = require('crypto');

// Configuration sécurisée
const CONFIG = {
    macAlgorithm: 'sha256',
    macKeySize: 32,  // 256 bits
    criticalFields: ['DE2', 'DE3', 'DE4', 'DE11', 'DE38', 'DE39', 'DE41', 'DE42'],
    rejectWithoutMAC: true
};

// Clé MAC (en production: stockée dans HSM)
const MAC_KEY = crypto.randomBytes(CONFIG.macKeySize);

/**
 * Classe de message ISO 8583 sécurisé avec MAC obligatoire
 */
class SecureISO8583Message {
    constructor() {
        this.fields = {};
        this.mac = null;
    }

    /**
     * Définit un champ du message
     */
    setField(fieldNumber, value) {
        this.fields[`DE${fieldNumber}`] = value;
        // Invalider le MAC si un champ change
        this.mac = null;
    }

    /**
     * Génère les données à inclure dans le MAC
     */
    getMACData() {
        // Inclure uniquement les champs critiques dans l'ordre
        const macParts = [];
        for (const field of CONFIG.criticalFields) {
            if (this.fields[field]) {
                macParts.push(`${field}=${this.fields[field]}`);
            }
        }
        return macParts.join('|');
    }

    /**
     * Calcule et ajoute le MAC au message
     */
    sign(key) {
        const macData = this.getMACData();
        this.mac = crypto.createHmac(CONFIG.macAlgorithm, key)
            .update(macData)
            .digest('hex')
            .toUpperCase();
        return this.mac;
    }

    /**
     * Vérifie le MAC du message
     */
    verify(key) {
        if (!this.mac) {
            return { valid: false, reason: 'MAC_MISSING' };
        }

        const macData = this.getMACData();
        const expectedMAC = crypto.createHmac(CONFIG.macAlgorithm, key)
            .update(macData)
            .digest('hex')
            .toUpperCase();

        const valid = crypto.timingSafeEqual(
            Buffer.from(this.mac, 'hex'),
            Buffer.from(expectedMAC, 'hex')
        );

        return {
            valid,
            reason: valid ? 'MAC_VALID' : 'MAC_MISMATCH'
        };
    }

    /**
     * Sérialise le message avec MAC
     */
    serialize() {
        if (!this.mac) {
            throw new Error('Message must be signed before serialization');
        }

        return JSON.stringify({
            fields: this.fields,
            mac: this.mac,
            macCoverage: CONFIG.criticalFields
        });
    }

    /**
     * Désérialise et vérifie un message
     */
    static deserialize(data, key) {
        const parsed = JSON.parse(data);
        const message = new SecureISO8583Message();
        message.fields = parsed.fields;
        message.mac = parsed.mac;

        // Vérification obligatoire à la désérialisation
        const verification = message.verify(key);
        if (!verification.valid) {
            throw new Error(`Security violation: ${verification.reason}`);
        }

        return message;
    }
}

/**
 * Middleware de vérification MAC pour serveur
 */
function macVerificationMiddleware(key) {
    return function (message) {
        // Rejeter les messages sans MAC
        if (!message.mac && CONFIG.rejectWithoutMAC) {
            return {
                accepted: false,
                responseCode: '05',  // Do not honor
                reason: 'MAC_REQUIRED'
            };
        }

        // Vérifier le MAC
        const verification = message.verify(key);
        if (!verification.valid) {
            console.log(`⚠️ Tentative de message altéré détectée!`);
            return {
                accepted: false,
                responseCode: '96',  // System malfunction
                reason: verification.reason
            };
        }

        return {
            accepted: true,
            reason: 'MAC_VALID'
        };
    };
}

/**
 * Démonstration du correctif
 */
function demonstrateFix() {
    console.log('═'.repeat(60));
    console.log('  🔵 CORRECTIF : MAC OBLIGATOIRE - Scénario 1');
    console.log('═'.repeat(60));

    // Créer un message valide
    console.log('\n📝 Création d\'un message avec MAC...');
    const validMessage = new SecureISO8583Message();
    validMessage.setField(2, '4111111111111111');  // PAN
    validMessage.setField(3, '000000');            // Processing Code
    validMessage.setField(4, '000010000');         // Amount
    validMessage.setField(11, '123456');           // STAN
    validMessage.setField(41, 'TERM0001');         // Terminal ID
    validMessage.setField(42, 'MERCH00000001');    // Merchant ID

    const mac = validMessage.sign(MAC_KEY);
    console.log(`   MAC calculé: ${mac.substring(0, 16)}...`);
    console.log(`   Champs couverts: ${CONFIG.criticalFields.join(', ')}`);

    // Vérification du message valide
    console.log('\n✅ Vérification du message valide:');
    const verification1 = validMessage.verify(MAC_KEY);
    console.log(`   Résultat: ${verification1.valid ? 'VALIDE' : 'INVALIDE'}`);
    console.log(`   Raison: ${verification1.reason}`);

    // Simulation d'une attaque (modification du montant)
    console.log('\n❌ Simulation d\'une attaque MitM:');
    console.log('   Tentative de modification du montant...');
    validMessage.fields['DE4'] = '000001000';  // Montant modifié
    // Le MAC n'est PAS recalculé (l'attaquant ne connaît pas la clé)

    const verification2 = validMessage.verify(MAC_KEY);
    console.log(`   Résultat après modification: ${verification2.valid ? 'VALIDE' : 'INVALIDE'}`);
    console.log(`   Raison: ${verification2.reason}`);
    console.log('   ✅ L\'ATTAQUE A ÉTÉ DÉTECTÉE!');

    // Utilisation du middleware
    console.log('\n🛡️ Test du middleware de vérification:');
    const middleware = macVerificationMiddleware(MAC_KEY);
    const result = middleware(validMessage);
    console.log(`   Accepté: ${result.accepted}`);
    console.log(`   Code réponse: ${result.responseCode || 'N/A'}`);
    console.log(`   Raison: ${result.reason}`);

    console.log('\n' + '─'.repeat(60));
    console.log('  💡 PROTECTION IMPLÉMENTÉE:');
    console.log('─'.repeat(60));
    console.log(`
  1. ✅ MAC obligatoire sur tous les champs critiques
  2. ✅ Rejet automatique des messages sans MAC
  3. ✅ Détection des modifications (MAC mismatch)
  4. ✅ Timing-safe comparison (anti side-channel)
  
  L'attaque MitM est maintenant IMPOSSIBLE sans la clé MAC.
`);
    console.log('═'.repeat(60) + '\n');
}

// Exécution
demonstrateFix();

module.exports = { SecureISO8583Message, macVerificationMiddleware };
