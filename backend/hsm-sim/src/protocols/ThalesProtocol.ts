/**
 * ThalesProtocol.ts
 * 
 * Simulation du protocole Thales HSM (PayShield 9000/10K)
 * Implémente les commandes standard de gestion de clés et de PIN
 * 
 * @educational Ce module simule le protocole de communication
 * utilisé par les HSM Thales en environnement bancaire
 */

import { CryptoEngine } from '../core/CryptoEngine';
import { KeyStore } from '../core/KeyStore';
import { AuditLogger } from '../core/AuditLogger';

// Types de commandes Thales
export type ThalesCommandCode =
    | 'A0' | 'A2'  // Génération de clés
    | 'BU' | 'BW'  // PIN Block translation
    | 'CA' | 'CC'  // PIN verification
    | 'CW' | 'CY'  // CVV generation/verification
    | 'DC' | 'DE'  // PIN change
    | 'EC' | 'ED'  // MAC generation/verification
    | 'FA' | 'FC'  // Key import/export
    | 'JA' | 'JC'  // Random number generation
    | 'JG' | 'JI'  // Key generation
    | 'KA' | 'KC'  // Key loading
    | 'NC'         // Diagnostic
    | 'NO';        // HSM status

export interface ThalesCommand {
    header: string;        // 4-byte header
    commandCode: ThalesCommandCode;
    data: Buffer;
    lmkId?: string;        // Local Master Key identifier
}

export interface ThalesResponse {
    header: string;
    responseCode: string;  // 2-byte response code (00 = success)
    errorCode?: string;    // Error code if failed
    data: Buffer;
}

// Codes d'erreur Thales
export const THALES_ERROR_CODES: Record<string, string> = {
    '00': 'No error',
    '01': 'Verification failure',
    '02': 'Key inappropriate length',
    '03': 'Key parity error',
    '04': 'Invalid key type',
    '05': 'Duplicate key',
    '10': 'Source key parity error',
    '11': 'Destination key parity error',
    '12': 'Invalid message header',
    '13': 'Invalid number of components',
    '14': 'Not a key encrypting key',
    '15': 'PIN block does not contain valid PIN',
    '20': 'Invalid PIN block format',
    '21': 'Invalid account number',
    '22': 'Security module not in authorized state',
    '23': 'Invalid command format',
    '24': 'Invalid key scheme',
    '25': 'Incompatible key length',
    '68': 'Command disabled',
    '90': 'Internal HSM error',
    '91': 'HSM memory error',
    '92': 'HSM battery low',
};

export class ThalesProtocol {
    private cryptoEngine: CryptoEngine;
    private keyStore: KeyStore;
    private auditLogger: AuditLogger;
    private lmk: Buffer; // Local Master Key (simulated)

    constructor(
        cryptoEngine: CryptoEngine,
        keyStore: KeyStore,
        auditLogger: AuditLogger
    ) {
        this.cryptoEngine = cryptoEngine;
        this.keyStore = keyStore;
        this.auditLogger = auditLogger;
        // LMK simulée pour environnement pédagogique
        this.lmk = Buffer.from('0123456789ABCDEF0123456789ABCDEF', 'hex');
    }

    /**
     * Parse une commande Thales depuis un buffer
     */
    parseCommand(buffer: Buffer): ThalesCommand {
        if (buffer.length < 6) {
            throw new Error('Invalid Thales command: too short');
        }

        const header = buffer.slice(0, 4).toString('ascii');
        const commandCode = buffer.slice(4, 6).toString('ascii') as ThalesCommandCode;
        const data = buffer.slice(6);

        this.auditLogger.log('THALES_PARSE', {
            header,
            commandCode,
            dataLength: data.length
        });

        return { header, commandCode, data };
    }

    /**
     * Formate une réponse Thales en buffer
     */
    formatResponse(response: ThalesResponse): Buffer {
        const headerBuf = Buffer.from(response.header, 'ascii');
        const responseBuf = Buffer.from(response.responseCode, 'ascii');

        if (response.errorCode) {
            const errorBuf = Buffer.from(response.errorCode, 'ascii');
            return Buffer.concat([headerBuf, responseBuf, errorBuf, response.data]);
        }

        return Buffer.concat([headerBuf, responseBuf, response.data]);
    }

    /**
     * Exécute une commande Thales
     */
    async executeCommand(command: ThalesCommand): Promise<ThalesResponse> {
        this.auditLogger.log('THALES_EXECUTE', { commandCode: command.commandCode });

        try {
            switch (command.commandCode) {
                case 'A0':
                    return this.generateKey(command);
                case 'BU':
                    return this.translatePinBlock(command);
                case 'CA':
                    return this.verifyPin(command);
                case 'CW':
                    return this.generateCVV(command);
                case 'CY':
                    return this.verifyCVV(command);
                case 'EC':
                    return this.generateMAC(command);
                case 'ED':
                    return this.verifyMAC(command);
                case 'FA':
                    return this.importKey(command);
                case 'JA':
                    return this.generateRandom(command);
                case 'NC':
                    return this.diagnostic(command);
                case 'NO':
                    return this.getStatus(command);
                default:
                    return this.errorResponse(command.header, '68', 'Command not implemented');
            }
        } catch (error) {
            this.auditLogger.log('THALES_ERROR', {
                commandCode: command.commandCode,
                error: (error as Error).message
            });
            return this.errorResponse(command.header, '90', (error as Error).message);
        }
    }

    /**
     * A0 - Generate a Key
     * Génère une clé sous LMK
     */
    private async generateKey(command: ThalesCommand): Promise<ThalesResponse> {
        const keyType = command.data.slice(0, 1).toString('ascii');
        const keyScheme = command.data.slice(1, 2).toString('ascii');

        // Détermine la longueur de clé
        let keyLength: 128 | 192 | 256;
        switch (keyScheme) {
            case 'U': keyLength = 128; break;
            case 'T': keyLength = 192; break;
            case 'X': keyLength = 256; break;
            default: keyLength = 128;
        }

        // Génère la clé
        const keyData = await this.cryptoEngine.generateSymmetricKey('AES', keyLength);

        // Chiffre sous LMK
        const encryptedKey = await this.cryptoEngine.encrypt(
            keyData,
            this.lmk,
            'AES-256-ECB'
        );

        // Calcule le KCV (Key Check Value)
        const kcv = await this.calculateKCV(keyData);

        this.auditLogger.log('THALES_A0', {
            keyType,
            keyScheme,
            keyLength,
            kcv: kcv.toString('hex').toUpperCase()
        });

        return {
            header: command.header,
            responseCode: 'A1',
            data: Buffer.concat([
                Buffer.from(keyScheme, 'ascii'),
                encryptedKey,
                kcv
            ])
        };
    }

    /**
     * BU - Translate PIN Block from TPK to ZPK
     * Translation de PIN block entre clés
     */
    private async translatePinBlock(command: ThalesCommand): Promise<ThalesResponse> {
        // Parse les paramètres
        const sourceKeyType = command.data.slice(0, 1).toString('ascii');
        const sourceKeyLength = sourceKeyType === 'U' ? 16 : sourceKeyType === 'T' ? 24 : 32;

        let offset = 1;
        const sourceKey = command.data.slice(offset, offset + sourceKeyLength);
        offset += sourceKeyLength;

        const destKeyType = command.data.slice(offset, offset + 1).toString('ascii');
        offset += 1;
        const destKeyLength = destKeyType === 'U' ? 16 : destKeyType === 'T' ? 24 : 32;

        const destKey = command.data.slice(offset, offset + destKeyLength);
        offset += destKeyLength;

        const pinBlock = command.data.slice(offset, offset + 16);
        offset += 16;

        const sourcePinBlockFormat = command.data.slice(offset, offset + 2).toString('ascii');
        offset += 2;

        const destPinBlockFormat = command.data.slice(offset, offset + 2).toString('ascii');
        offset += 2;

        const accountNumber = command.data.slice(offset, offset + 12).toString('ascii');

        // Déchiffre le PIN block source
        const decryptedBlock = await this.cryptoEngine.decrypt(
            pinBlock,
            sourceKey,
            'DES3-CBC'
        );

        // Recalcule le PIN block au format destination si nécessaire
        let translatedBlock = decryptedBlock;
        if (sourcePinBlockFormat !== destPinBlockFormat) {
            // Conversion de format (simplifié)
            translatedBlock = this.convertPinBlockFormat(
                decryptedBlock,
                sourcePinBlockFormat,
                destPinBlockFormat,
                accountNumber
            );
        }

        // Chiffre sous la clé destination
        const encryptedBlock = await this.cryptoEngine.encrypt(
            translatedBlock,
            destKey,
            'DES3-CBC'
        );

        this.auditLogger.log('THALES_BU', {
            sourcePinBlockFormat,
            destPinBlockFormat,
            success: true
        });

        return {
            header: command.header,
            responseCode: 'BV',
            data: encryptedBlock
        };
    }

    /**
     * CA - Verify Interchange PIN using IBM Method
     */
    private async verifyPin(command: ThalesCommand): Promise<ThalesResponse> {
        const zpkLength = command.data[0] === 0x55 ? 16 : 32; // 'U' = single length
        let offset = 1;

        const zpk = command.data.slice(offset, offset + zpkLength);
        offset += zpkLength;

        const pvk = command.data.slice(offset, offset + 16);
        offset += 16;

        const pinBlock = command.data.slice(offset, offset + 16);
        offset += 16;

        const pinBlockFormat = command.data.slice(offset, offset + 2).toString('ascii');
        offset += 2;

        const checkLength = parseInt(command.data.slice(offset, offset + 2).toString('ascii'));
        offset += 2;

        const pan = command.data.slice(offset, offset + 12).toString('ascii');
        offset += 12;

        const decimalisationTable = command.data.slice(offset, offset + 16).toString('ascii');
        offset += 16;

        const pinValidationData = command.data.slice(offset, offset + 12).toString('ascii');
        offset += 12;

        const pinOffset = command.data.slice(offset, offset + 12).toString('ascii');

        // Déchiffre le PIN block
        const decryptedPin = await this.cryptoEngine.decrypt(pinBlock, zpk, 'DES3-CBC');

        // Extrait le PIN du block
        const extractedPin = this.extractPinFromBlock(decryptedPin, pinBlockFormat, pan);

        // Calcule le PIN naturel (IBM method)
        const naturalPin = await this.calculateNaturalPin(
            pvk,
            pan,
            decimalisationTable,
            pinValidationData
        );

        // Applique l'offset
        const expectedPin = this.applyPinOffset(naturalPin, pinOffset, checkLength);

        // Compare
        const isValid = extractedPin.slice(0, checkLength) === expectedPin;

        this.auditLogger.log('THALES_CA', {
            pinBlockFormat,
            checkLength,
            verified: isValid
        });

        if (isValid) {
            return {
                header: command.header,
                responseCode: 'CB',
                data: Buffer.alloc(0)
            };
        } else {
            return this.errorResponse(command.header, '01', 'PIN verification failed');
        }
    }

    /**
     * CW - Generate CVV
     */
    private async generateCVV(command: ThalesCommand): Promise<ThalesResponse> {
        const cvkLength = command.data[0] === 0x55 ? 16 : 32;
        let offset = 1;

        const cvkA = command.data.slice(offset, offset + cvkLength);
        offset += cvkLength;
        const cvkB = command.data.slice(offset, offset + cvkLength);
        offset += cvkLength;

        const pan = command.data.slice(offset, offset + 16).toString('ascii').replace(/F/g, '');
        offset += 16;

        const expiryDate = command.data.slice(offset, offset + 4).toString('ascii'); // YYMM
        offset += 4;

        const serviceCode = command.data.slice(offset, offset + 3).toString('ascii');

        // Calcule le CVV selon l'algorithme Visa
        const cvv = await this.calculateCVV(cvkA, cvkB, pan, expiryDate, serviceCode);

        this.auditLogger.log('THALES_CW', {
            pan: pan.slice(0, 6) + '******' + pan.slice(-4),
            expiryDate
        });

        return {
            header: command.header,
            responseCode: 'CX',
            data: Buffer.from(cvv, 'ascii')
        };
    }

    /**
     * CY - Verify CVV
     */
    private async verifyCVV(command: ThalesCommand): Promise<ThalesResponse> {
        const cvkLength = command.data[0] === 0x55 ? 16 : 32;
        let offset = 1;

        const cvkA = command.data.slice(offset, offset + cvkLength);
        offset += cvkLength;
        const cvkB = command.data.slice(offset, offset + cvkLength);
        offset += cvkLength;

        const cvv = command.data.slice(offset, offset + 3).toString('ascii');
        offset += 3;

        const pan = command.data.slice(offset, offset + 16).toString('ascii').replace(/F/g, '');
        offset += 16;

        const expiryDate = command.data.slice(offset, offset + 4).toString('ascii');
        offset += 4;

        const serviceCode = command.data.slice(offset, offset + 3).toString('ascii');

        const expectedCvv = await this.calculateCVV(cvkA, cvkB, pan, expiryDate, serviceCode);
        const isValid = cvv === expectedCvv;

        this.auditLogger.log('THALES_CY', {
            verified: isValid
        });

        if (isValid) {
            return {
                header: command.header,
                responseCode: 'CZ',
                data: Buffer.alloc(0)
            };
        } else {
            return this.errorResponse(command.header, '01', 'CVV verification failed');
        }
    }

    /**
     * EC - Generate MAC
     */
    private async generateMAC(command: ThalesCommand): Promise<ThalesResponse> {
        const makLength = command.data[0] === 0x55 ? 16 : 32;
        let offset = 1;

        const mak = command.data.slice(offset, offset + makLength);
        offset += makLength;

        const messageLength = parseInt(command.data.slice(offset, offset + 4).toString('ascii'), 16);
        offset += 4;

        const message = command.data.slice(offset, offset + messageLength);

        // Calcule le MAC (Retail MAC / ISO 9797-1 Method 1)
        const mac = await this.cryptoEngine.generateMac(message, mak, 'RETAIL-MAC');

        this.auditLogger.log('THALES_EC', {
            messageLength,
            macGenerated: true
        });

        return {
            header: command.header,
            responseCode: 'ED',
            data: mac
        };
    }

    /**
     * ED - Verify MAC
     */
    private async verifyMAC(command: ThalesCommand): Promise<ThalesResponse> {
        const makLength = command.data[0] === 0x55 ? 16 : 32;
        let offset = 1;

        const mak = command.data.slice(offset, offset + makLength);
        offset += makLength;

        const messageLength = parseInt(command.data.slice(offset, offset + 4).toString('ascii'), 16);
        offset += 4;

        const message = command.data.slice(offset, offset + messageLength);
        offset += messageLength;

        const receivedMac = command.data.slice(offset, offset + 8);

        const calculatedMac = await this.cryptoEngine.generateMac(message, mak, 'RETAIL-MAC');
        const isValid = calculatedMac.compare(receivedMac) === 0;

        this.auditLogger.log('THALES_ED', {
            verified: isValid
        });

        if (isValid) {
            return {
                header: command.header,
                responseCode: 'EE',
                data: Buffer.alloc(0)
            };
        } else {
            return this.errorResponse(command.header, '01', 'MAC verification failed');
        }
    }

    /**
     * FA - Import Key under LMK
     */
    private async importKey(command: ThalesCommand): Promise<ThalesResponse> {
        const keyType = command.data.slice(0, 3).toString('ascii');
        const keyScheme = command.data.slice(3, 4).toString('ascii');
        const keyLength = keyScheme === 'U' ? 16 : keyScheme === 'T' ? 24 : 32;

        let offset = 4;
        const zmk = command.data.slice(offset, offset + keyLength);
        offset += keyLength;

        const keyToImport = command.data.slice(offset, offset + keyLength);

        // Déchiffre la clé avec ZMK
        const decryptedKey = await this.cryptoEngine.decrypt(keyToImport, zmk, 'DES3-ECB');

        // Rechiffre sous LMK
        const encryptedUnderLMK = await this.cryptoEngine.encrypt(
            decryptedKey,
            this.lmk,
            'AES-256-ECB'
        );

        // Calcule KCV
        const kcv = await this.calculateKCV(decryptedKey);

        // Stocke la clé
        const keyId = `KEY_${Date.now()}`;
        await this.keyStore.storeKey(keyId, decryptedKey, keyType);

        this.auditLogger.log('THALES_FA', {
            keyType,
            keyScheme,
            keyId,
            kcv: kcv.toString('hex')
        });

        return {
            header: command.header,
            responseCode: 'FB',
            data: Buffer.concat([
                Buffer.from(keyScheme, 'ascii'),
                encryptedUnderLMK,
                kcv
            ])
        };
    }

    /**
     * JA - Generate Random Number
     */
    private async generateRandom(command: ThalesCommand): Promise<ThalesResponse> {
        const length = parseInt(command.data.slice(0, 4).toString('ascii'), 16);
        const randomData = await this.cryptoEngine.generateRandom(Math.min(length, 256));

        this.auditLogger.log('THALES_JA', { length });

        return {
            header: command.header,
            responseCode: 'JB',
            data: randomData
        };
    }

    /**
     * NC - Diagnostic
     */
    private async diagnostic(command: ThalesCommand): Promise<ThalesResponse> {
        const diagnosticInfo = {
            lmkId: '00',
            firmwareVersion: 'PED-SIM-1.0.0',
            serialNumber: 'PMSIM000001',
            tamperStatus: '00',
            batteryStatus: '00',
            timestamp: new Date().toISOString()
        };

        this.auditLogger.log('THALES_NC', diagnosticInfo);

        const data = Buffer.from(JSON.stringify(diagnosticInfo), 'utf-8');

        return {
            header: command.header,
            responseCode: 'ND',
            data
        };
    }

    /**
     * NO - Get HSM Status
     */
    private async getStatus(command: ThalesCommand): Promise<ThalesResponse> {
        const status = {
            mode: 'AUTHORIZED',
            errorCount: 0,
            keysLoaded: await this.keyStore.getKeyCount(),
            uptime: process.uptime()
        };

        this.auditLogger.log('THALES_NO', status);

        return {
            header: command.header,
            responseCode: 'NP',
            data: Buffer.from(JSON.stringify(status), 'utf-8')
        };
    }

    // Méthodes utilitaires privées

    private errorResponse(header: string, errorCode: string, message?: string): ThalesResponse {
        return {
            header,
            responseCode: 'ER',
            errorCode,
            data: Buffer.from(THALES_ERROR_CODES[errorCode] || message || 'Unknown error', 'utf-8')
        };
    }

    private async calculateKCV(key: Buffer): Promise<Buffer> {
        // KCV = premiers 3 bytes de 3DES encrypt(0x0000000000000000, key)
        const zeros = Buffer.alloc(8, 0);
        const encrypted = await this.cryptoEngine.encrypt(zeros, key, 'DES3-ECB');
        return encrypted.slice(0, 3);
    }

    private convertPinBlockFormat(
        block: Buffer,
        sourceFormat: string,
        destFormat: string,
        pan: string
    ): Buffer {
        // Implémentation simplifiée de conversion de format
        // En production, il faudrait implémenter toutes les conversions ISO 9564
        return block; // Pas de conversion pour la démo
    }

    private extractPinFromBlock(block: Buffer, format: string, pan: string): string {
        // Format 0 (ISO 9564-1 Format 0)
        const pinLengthNibble = (block[0] & 0x0F);
        let pin = '';

        for (let i = 0; i < pinLengthNibble; i++) {
            const byteIndex = Math.floor((i + 1) / 2);
            const nibble = (i % 2 === 0)
                ? (block[byteIndex] >> 4) & 0x0F
                : block[byteIndex] & 0x0F;
            pin += nibble.toString(16).toUpperCase();
        }

        return pin;
    }

    private async calculateNaturalPin(
        pvk: Buffer,
        pan: string,
        decimalisationTable: string,
        validationData: string
    ): Promise<string> {
        // Algorithme IBM simplifié
        const plaintext = Buffer.from(validationData.padEnd(16, '0'), 'hex');
        const encrypted = await this.cryptoEngine.encrypt(plaintext, pvk, 'DES3-ECB');

        let naturalPin = '';
        for (let i = 0; i < 4; i++) {
            const nibble = (encrypted[i] >> 4) & 0x0F;
            const decimalizedNibble = parseInt(decimalisationTable[nibble], 16);
            naturalPin += decimalizedNibble.toString();
        }

        return naturalPin;
    }

    private applyPinOffset(naturalPin: string, offset: string, length: number): string {
        let result = '';
        for (let i = 0; i < length; i++) {
            const pinDigit = parseInt(naturalPin[i] || '0');
            const offsetDigit = parseInt(offset[i] || '0');
            result += ((pinDigit + offsetDigit) % 10).toString();
        }
        return result;
    }

    private async calculateCVV(
        cvkA: Buffer,
        cvkB: Buffer,
        pan: string,
        expiryDate: string,
        serviceCode: string
    ): Promise<string> {
        // Algorithme CVV Visa simplifié
        const data = pan + expiryDate + serviceCode;
        const paddedData = data.padEnd(32, '0');

        // Première partie avec CVK-A
        const block1 = Buffer.from(paddedData.slice(0, 16), 'hex');
        const encrypted1 = await this.cryptoEngine.encrypt(block1, cvkA, 'DES-ECB');

        // XOR avec deuxième partie
        const block2 = Buffer.from(paddedData.slice(16, 32), 'hex');
        const xored = Buffer.alloc(8);
        for (let i = 0; i < 8; i++) {
            xored[i] = encrypted1[i] ^ block2[i];
        }

        // Chiffrement avec CVK-A puis déchiffrement avec CVK-B puis chiffrement avec CVK-A
        const encrypted2 = await this.cryptoEngine.encrypt(xored, cvkA, 'DES-ECB');
        const decrypted = await this.cryptoEngine.decrypt(encrypted2, cvkB, 'DES-ECB');
        const encrypted3 = await this.cryptoEngine.encrypt(decrypted, cvkA, 'DES-ECB');

        // Extraction des 3 digits CVV
        let cvv = '';
        const hex = encrypted3.toString('hex').toUpperCase();

        // Première passe: digits 0-9
        for (const char of hex) {
            if (char >= '0' && char <= '9' && cvv.length < 3) {
                cvv += char;
            }
        }

        // Deuxième passe: A-F -> 0-5
        if (cvv.length < 3) {
            for (const char of hex) {
                if (char >= 'A' && char <= 'F' && cvv.length < 3) {
                    cvv += (parseInt(char, 16) - 10).toString();
                }
            }
        }

        return cvv.padEnd(3, '0');
    }
}
