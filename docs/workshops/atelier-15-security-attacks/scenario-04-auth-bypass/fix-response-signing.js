/**
 * Scénario 4 : Correctif
 * Signature numérique des réponses d'autorisation
 * 
 * Usage: node fix-response-signing.js
 */

const crypto = require('crypto');

// Configuration de sécurité
const CONFIG = {
    algorithm: 'sha256',
    signedFields: ['DE2', 'DE3', 'DE4', 'DE11', 'DE38', 'DE39'],
    keyRotationHours: 24
};

// Clés de signature (en prod: HSM)
const SIGNING_KEY = crypto.randomBytes(32);

/**
 * Classe pour les réponses d'autorisation sécurisées
 */
class SecureAuthorizationResponse {
    constructor() {
        this.fields = {};
        this.signature = null;
        this.signatureTimestamp = null;
    }

    /**
     * Définit les champs de la réponse
     */
    setFields(fields) {
        this.fields = { ...fields };
    }

    /**
     * Génère les données à signer
     */
    getSignatureData() {
        const parts = [];
        for (const field of CONFIG.signedFields) {
            if (this.fields[field] !== undefined) {
                parts.push(`${field}=${this.fields[field]}`);
            }
        }
        // Ajouter le timestamp pour éviter les rejeux
        parts.push(`TS=${this.signatureTimestamp}`);
        return parts.join('|');
    }

    /**
     * Signe la réponse
     */
    sign(key) {
        this.signatureTimestamp = Date.now().toString();
        const data = this.getSignatureData();

        const hmac = crypto.createHmac(CONFIG.algorithm, key);
        hmac.update(data);
        this.signature = hmac.digest('hex').toUpperCase();

        return this.signature;
    }

    /**
     * Vérifie la signature de la réponse
     */
    verify(key, maxAgeMs = 60000) {
        if (!this.signature || !this.signatureTimestamp) {
            return { valid: false, reason: 'MISSING_SIGNATURE' };
        }

        // Vérifier l'âge de la signature
        const age = Date.now() - parseInt(this.signatureTimestamp);
        if (age > maxAgeMs) {
            return { valid: false, reason: 'SIGNATURE_EXPIRED' };
        }

        // Vérifier la signature
        const data = this.getSignatureData();
        const hmac = crypto.createHmac(CONFIG.algorithm, key);
        hmac.update(data);
        const expectedSignature = hmac.digest('hex').toUpperCase();

        const valid = crypto.timingSafeEqual(
            Buffer.from(this.signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );

        return {
            valid,
            reason: valid ? 'VALID' : 'SIGNATURE_MISMATCH'
        };
    }

    /**
     * Sérialise la réponse avec signature
     */
    serialize() {
        return JSON.stringify({
            fields: this.fields,
            signature: this.signature,
            signatureTimestamp: this.signatureTimestamp,
            signedFields: CONFIG.signedFields
        });
    }

    /**
     * Désérialise et vérifie
     */
    static deserializeAndVerify(data, key) {
        const parsed = JSON.parse(data);
        const response = new SecureAuthorizationResponse();
        response.fields = parsed.fields;
        response.signature = parsed.signature;
        response.signatureTimestamp = parsed.signatureTimestamp;

        const verification = response.verify(key);
        if (!verification.valid) {
            throw new Error(`Signature verification failed: ${verification.reason}`);
        }

        return response;
    }
}

/**
 * Simulateur de serveur d'autorisation sécurisé
 */
class SecureAuthServer {
    constructor(signingKey) {
        this.signingKey = signingKey;
    }

    /**
     * Traite une requête d'autorisation
     */
    processAuthorization(request) {
        // Simuler la décision d'autorisation
        const decision = this.makeDecision(request);

        // Créer la réponse
        const response = new SecureAuthorizationResponse();
        response.setFields({
            DE2: request.pan,
            DE3: request.processingCode || '000000',
            DE4: request.amount,
            DE11: request.stan,
            DE38: decision.authCode,
            DE39: decision.responseCode
        });

        // Signer la réponse
        response.sign(this.signingKey);

        return response;
    }

    /**
     * Simule la décision d'autorisation
     */
    makeDecision(request) {
        // Logique simplifiée
        const amount = parseInt(request.amount);

        if (amount > 100000) {
            return { responseCode: '51', authCode: '' };  // Refusé
        }

        return {
            responseCode: '00',
            authCode: crypto.randomBytes(3).toString('hex').toUpperCase()
        };
    }
}

/**
 * Middleware de vérification côté terminal
 */
function responseVerificationMiddleware(signingKey) {
    return function (serializedResponse) {
        try {
            const response = SecureAuthorizationResponse.deserializeAndVerify(
                serializedResponse,
                signingKey
            );
            return {
                accepted: true,
                response: response.fields,
                message: 'Signature valide'
            };
        } catch (error) {
            return {
                accepted: false,
                response: null,
                message: `Réponse rejetée: ${error.message}`
            };
        }
    };
}

/**
 * Démonstration du correctif
 */
function demonstrateFix() {
    console.log('═'.repeat(60));
    console.log('  🔵 CORRECTIF : SIGNATURE DES RÉPONSES - Scénario 4');
    console.log('═'.repeat(60));

    const server = new SecureAuthServer(SIGNING_KEY);
    const verifyResponse = responseVerificationMiddleware(SIGNING_KEY);

    // Test 1: Transaction normale
    console.log('\n📝 Test 1: Transaction normale');
    const request1 = { pan: '4111111111111111', amount: '10000', stan: '000001' };
    const response1 = server.processAuthorization(request1);

    console.log(`   Requête: ${request1.pan.slice(-4)}, ${parseInt(request1.amount) / 100} EUR`);
    console.log(`   Réponse: ${response1.fields.DE39} (${response1.fields.DE38 || 'N/A'})`);
    console.log(`   Signature: ${response1.signature.substring(0, 20)}...`);

    const verification1 = verifyResponse(response1.serialize());
    console.log(`   Vérification: ${verification1.accepted ? '✅ Acceptée' : '❌ Rejetée'}`);

    // Test 2: Tentative de modification (simulation d'attaque)
    console.log('\n📝 Test 2: Tentative de modification');
    const response2 = server.processAuthorization({
        pan: '5500000000000004',
        amount: '500000',  // Montant élevé = refus
        stan: '000002'
    });

    console.log(`   Réponse originale: ${response2.fields.DE39}`);

    // L'attaquant modifie le code réponse
    const tamperedData = JSON.parse(response2.serialize());
    tamperedData.fields.DE39 = '00';  // Forcer l'approbation
    tamperedData.fields.DE38 = 'FAKE01';

    console.log(`   Réponse modifiée: ${tamperedData.fields.DE39} (${tamperedData.fields.DE38})`);

    const verification2 = verifyResponse(JSON.stringify(tamperedData));
    console.log(`   Vérification: ${verification2.accepted ? '✅ Acceptée' : '❌ REJETÉE'}`);
    console.log(`   Raison: ${verification2.message}`);

    // Test 3: Signature expirée
    console.log('\n📝 Test 3: Signature expirée');
    const response3 = server.processAuthorization({
        pan: '340000000000009',
        amount: '5000',
        stan: '000003'
    });

    // Simuler une signature ancienne
    const expiredData = JSON.parse(response3.serialize());
    expiredData.signatureTimestamp = (Date.now() - 120000).toString(); // 2 minutes

    const verification3 = verifyResponse(JSON.stringify(expiredData));
    console.log(`   Vérification: ${verification3.accepted ? '✅ Acceptée' : '❌ REJETÉE'}`);
    console.log(`   Raison: ${verification3.message}`);

    console.log('\n' + '─'.repeat(60));
    console.log('  💡 PROTECTION IMPLÉMENTÉE:');
    console.log('─'.repeat(60));
    console.log(`
  1. ✅ Signature HMAC-SHA256 sur tous les champs critiques
  2. ✅ Timestamp anti-rejeu dans la signature
  3. ✅ Expiration des signatures (1 minute)
  4. ✅ Timing-safe comparison
  
  L'Authorization Bypass est maintenant IMPOSSIBLE:
  - Toute modification invalide la signature
  - Le terminal REJETTE les réponses non signées
  - Les signatures périmées sont refusées
`);
    console.log('═'.repeat(60) + '\n');
}

// Exécution
demonstrateFix();

module.exports = {
    SecureAuthorizationResponse,
    SecureAuthServer,
    responseVerificationMiddleware
};
