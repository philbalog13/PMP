/**
 * Atelier 6 : Constructeur de Messages ISO 8583
 * 
 * Démontre la construction et le parsing de messages
 * au format ISO 8583 utilisé dans les transactions bancaires.
 * 
 * Usage: node message-builder.js
 */

const fs = require('fs');
const path = require('path');

// Charger la référence des champs
const fieldRef = JSON.parse(fs.readFileSync(path.join(__dirname, 'field-reference.json'), 'utf8'));

/**
 * Classe pour construire des messages ISO 8583
 */
class ISO8583Builder {
    constructor() {
        this.mti = '';
        this.fields = new Map();
    }

    /**
     * Définit le Message Type Indicator
     */
    setMTI(mti) {
        if (!fieldRef.mti[mti]) {
            throw new Error(`MTI inconnu: ${mti}`);
        }
        this.mti = mti;
        return this;
    }

    /**
     * Ajoute un champ de données
     */
    setField(number, value) {
        const fieldDef = fieldRef.dataElements[number.toString()];
        if (!fieldDef) {
            console.warn(`⚠️ Champ ${number} non défini dans la référence`);
        }
        this.fields.set(number, value);
        return this;
    }

    /**
     * Génère le bitmap primaire (champs 1-64)
     */
    generateBitmap() {
        let bitmap = BigInt(0);

        for (const fieldNum of this.fields.keys()) {
            if (fieldNum >= 1 && fieldNum <= 64) {
                bitmap |= BigInt(1) << BigInt(64 - fieldNum);
            }
        }

        return bitmap.toString(16).toUpperCase().padStart(16, '0');
    }

    /**
     * Formate un champ selon sa définition
     */
    formatField(number, value) {
        const fieldDef = fieldRef.dataElements[number.toString()];
        if (!fieldDef) return value;

        switch (fieldDef.type) {
            case 'FIXED':
                return value.toString();
            case 'LLVAR':
                const len = value.length.toString().padStart(2, '0');
                return len + value;
            case 'LLLVAR':
                const len3 = value.length.toString().padStart(3, '0');
                return len3 + value;
            default:
                return value;
        }
    }

    /**
     * Construit le message complet
     */
    build() {
        if (!this.mti) throw new Error('MTI non défini');

        const bitmap = this.generateBitmap();
        let dataElements = '';

        // Trier les champs par numéro
        const sortedFields = [...this.fields.entries()].sort((a, b) => a[0] - b[0]);

        for (const [number, value] of sortedFields) {
            dataElements += this.formatField(number, value);
        }

        return {
            raw: this.mti + bitmap + dataElements,
            formatted: {
                mti: this.mti,
                bitmap: bitmap,
                fields: Object.fromEntries(this.fields)
            }
        };
    }
}

/**
 * Classe pour parser des messages ISO 8583
 */
class ISO8583Parser {
    static parse(rawMessage) {
        const result = {
            mti: rawMessage.substring(0, 4),
            bitmap: rawMessage.substring(4, 20),
            fields: {}
        };

        // Décoder le bitmap
        const bitmapBigInt = BigInt('0x' + result.bitmap);
        const activeFields = [];

        for (let i = 1; i <= 64; i++) {
            if (bitmapBigInt & (BigInt(1) << BigInt(64 - i))) {
                activeFields.push(i);
            }
        }

        result.activeFields = activeFields;
        result.mtiInfo = fieldRef.mti[result.mti] || { name: 'Unknown' };

        return result;
    }
}

/**
 * Crée un message d'autorisation (0100)
 */
function createAuthorizationRequest(data) {
    const now = new Date();
    const builder = new ISO8583Builder();

    return builder
        .setMTI('0100')
        .setField(2, data.pan)
        .setField(3, '000000')  // Purchase
        .setField(4, data.amount.toString().padStart(12, '0'))
        .setField(7, formatTransmissionDateTime(now))
        .setField(11, data.stan.toString().padStart(6, '0'))
        .setField(12, formatTime(now))
        .setField(13, formatDate(now))
        .setField(14, data.expiry)
        .setField(22, '051')  // Chip
        .setField(41, data.terminalId.padEnd(8, ' '))
        .setField(42, data.merchantId.padEnd(15, ' '))
        .setField(49, '978')  // EUR
        .setField(52, data.pinBlock || '0000000000000000')
        .build();
}

/**
 * Crée une réponse d'autorisation (0110)
 */
function createAuthorizationResponse(request, responseCode, authCode) {
    const builder = new ISO8583Builder();

    return builder
        .setMTI('0110')
        .setField(2, request.fields['2'])
        .setField(3, request.fields['3'])
        .setField(4, request.fields['4'])
        .setField(7, request.fields['7'])
        .setField(11, request.fields['11'])
        .setField(37, generateRRN())
        .setField(38, authCode || '')
        .setField(39, responseCode)
        .setField(41, request.fields['41'])
        .setField(42, request.fields['42'])
        .build();
}

// Helpers
function formatTime(date) {
    return date.toTimeString().substring(0, 8).replace(/:/g, '');
}

function formatDate(date) {
    return (date.getMonth() + 1).toString().padStart(2, '0') +
        date.getDate().toString().padStart(2, '0');
}

function formatTransmissionDateTime(date) {
    return formatDate(date) + formatTime(date);
}

function generateRRN() {
    return Date.now().toString().slice(-12);
}

/**
 * Affiche un message de manière formatée
 */
function displayMessage(msg, title) {
    console.log('\n┌' + '─'.repeat(68) + '┐');
    console.log('│ ' + title.padEnd(67) + '│');
    console.log('├' + '─'.repeat(68) + '┤');
    console.log(`│ MTI:    ${msg.formatted.mti} (${fieldRef.mti[msg.formatted.mti]?.name || 'Unknown'})`.padEnd(69) + '│');
    console.log(`│ Bitmap: ${msg.formatted.bitmap}`.padEnd(69) + '│');
    console.log('├' + '─'.repeat(68) + '┤');
    console.log('│ Champs:'.padEnd(69) + '│');

    for (const [field, value] of Object.entries(msg.formatted.fields)) {
        const fieldDef = fieldRef.dataElements[field];
        const name = fieldDef ? fieldDef.name.substring(0, 30) : 'Unknown';
        console.log(`│   DE${field.padStart(2, '0')}: ${name.padEnd(32)} = ${value.substring(0, 16)}`.padEnd(69) + '│');
    }

    console.log('├' + '─'.repeat(68) + '┤');
    console.log(`│ Raw: ${msg.raw.substring(0, 60)}...`.padEnd(69) + '│');
    console.log('└' + '─'.repeat(68) + '┘');
}

// Démonstration
function demo() {
    console.log('═'.repeat(70));
    console.log('  📨 CONSTRUCTEUR DE MESSAGES ISO 8583 - Atelier 6');
    console.log('═'.repeat(70));

    // Créer une demande d'autorisation
    console.log('\n📝 Création d\'une demande d\'autorisation (0100):');

    const authRequest = createAuthorizationRequest({
        pan: '4111111111111111',
        amount: 5000,  // 50.00 EUR
        stan: 123456,
        expiry: '2812',
        terminalId: 'TERM0001',
        merchantId: 'MERCHANT0000001',
        pinBlock: 'ABCD1234EFGH5678'
    });

    displayMessage(authRequest, 'Authorization Request (0100)');

    // Créer une réponse approuvée
    console.log('\n📝 Création d\'une réponse approuvée (0110):');

    const authResponse = createAuthorizationResponse(
        authRequest.formatted,
        '00',    // Approved
        'A12345' // Auth code
    );

    displayMessage(authResponse, 'Authorization Response (0110) - APPROVED');

    // Créer une réponse refusée
    console.log('\n📝 Création d\'une réponse refusée (0110):');

    const declinedResponse = createAuthorizationResponse(
        authRequest.formatted,
        '51',  // Insufficient funds
        ''     // No auth code
    );

    displayMessage(declinedResponse, 'Authorization Response (0110) - DECLINED');

    // Afficher les codes réponse
    console.log('\n' + '═'.repeat(70));
    console.log('  📋 CODES RÉPONSE ISO 8583');
    console.log('═'.repeat(70));
    console.log('\n| Code | Signification              | Action                    |');
    console.log('|------|----------------------------|---------------------------|');

    for (const [code, info] of Object.entries(fieldRef.responseCodes)) {
        console.log(`| ${code}   | ${info.meaning.padEnd(26)} | ${info.action.padEnd(25)} |`);
    }
}

demo();
