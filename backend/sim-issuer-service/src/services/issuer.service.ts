import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { getAccountByPan, debitAccount, creditAccount } from './account.service';

export interface AuthorizationRequest {
    transactionId: string;
    pan: string;
    amount: number;
    currency: string;
    merchantId: string;
    mcc: string;
    transactionType: string;
    pinBlock?: string;  // Encrypted PIN Block from TPE
}

export interface AuthorizationResponse {
    transactionId: string;
    approved: boolean;
    responseCode: string;
    authorizationCode?: string;
    balance?: number;
    message?: string;
    cryptogram?: string;  // Signed response from HSM
    _educational?: {
        flowSteps: string[];
        hsmOperations: string[];
    };
}

/**
 * Generate 6-digit authorization code
 */
const generateAuthCode = (): string => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

/**
 * HSM: Decrypt PIN Block (Diagram Step: Banque → HSM: Décrypte PIN Block)
 */
const decryptPinBlock = async (pinBlock: string, pan: string): Promise<{ success: boolean; decryptedPin?: string; error?: string }> => {
    console.log(`[ISSUER→HSM] Decrypting PIN Block...`);
    try {
        const response = await axios.post(
            `${config.hsmSimulator.url}/hsm/decrypt-pin`,
            { pinBlock, pan },
            { timeout: config.hsmSimulator.timeout }
        );
        console.log(`[HSM→ISSUER] PIN Decrypted successfully`);
        return { success: true, decryptedPin: response.data.pin };
    } catch (error) {
        console.log(`[HSM] PIN decryption unavailable, continuing with simulated validation...`);
        // Simulate successful decryption for educational purposes
        return { success: true, decryptedPin: '****' };
    }
};

/**
 * HSM: Sign authorization response (Diagram Step: Banque → HSM: Génère réponse cryptée)
 */
const signAuthorizationResponse = async (response: Partial<AuthorizationResponse>): Promise<string> => {
    console.log(`[ISSUER→HSM] Generating signed response cryptogram...`);
    try {
        const hsmResponse = await axios.post(
            `${config.hsmSimulator.url}/hsm/generate-mac`,
            {
                data: JSON.stringify(response),
                keyLabel: 'ZAK_002', // Changed keyId to keyLabel to match HSM command
                method: 'ALG3'
            },
            { timeout: config.hsmSimulator.timeout }
        );
        console.log(`[HSM→ISSUER] Response signed with MAC`);
        return hsmResponse.data.mac || hsmResponse.data.cryptogram;
    } catch (error) {
        console.log(`[HSM] Signing unavailable, generating simulated cryptogram...`);
        // Generate simulated MAC for educational purposes
        return Math.random().toString(16).substring(2, 18).toUpperCase();
    }
};

/**
 * HSM: Encrypt Sensitive Data (Diagram Step: HSM → Chiffrement Données Sensibles)
 */
const encryptSensitiveData = async (data: string): Promise<string> => {
    console.log(`[ISSUER→HSM] Encrypting sensitive data...`);
    try {
        const response = await axios.post(
            `${config.hsmSimulator.url}/hsm/encrypt-data`,
            { data, keyLabel: 'ZEK_001' },
            { timeout: config.hsmSimulator.timeout }
        );
        return response.data.encryptedData;
    } catch (error) {
        console.log(`[HSM] Encryption unavailable, using simulation...`);
        return 'ENC_' + Math.random().toString(36).substring(7);
    }
};

/**
 * HSM: Calculate KCV (Diagram Step: HSM → Calcul KCV)
 */
const calculateKcv = async (): Promise<string> => {
    console.log(`[ISSUER→HSM] Calculating KCV...`);
    try {
        const response = await axios.post(
            `${config.hsmSimulator.url}/hsm/calculate-kcv`,
            { keyLabel: 'ZEK_001' },
            { timeout: config.hsmSimulator.timeout }
        );
        return response.data.kcv;
    } catch (error) {
        console.log(`[HSM] KCV unavailable, using simulation...`);
        return 'KCV_' + Math.floor(Math.random() * 9999);
    }
};

/**
 * Authorize a transaction (Fully conformant to Sequence Diagram)
 * Flow: Réseau → Banque Émettrice → HSM → Base Comptes → Moteur Auth → Détection Fraude → HSM → Réseau
 */
export const authorizeTransaction = async (request: AuthorizationRequest): Promise<AuthorizationResponse> => {
    console.log(`[ISSUER] ═══════════════════════════════════════════`);
    console.log(`[ISSUER] Processing authorization for ${request.transactionId}`);

    const flowSteps: string[] = [];
    const hsmOperations: string[] = [];

    // ══════════════════════════════════════════════════════════════════
    // STEP 1: Receive ISO 8583 Message (Réseau → Banque Émettrice)
    // ══════════════════════════════════════════════════════════════════
    flowSteps.push('1. Réception Message ISO 8583 du Réseau');
    console.log(`[ISSUER] Step 1: Message ISO 8583 received from Network`);

    // ══════════════════════════════════════════════════════════════════
    // STEP 2: Decrypt PIN Block via HSM (Banque → HSM: Décrypte PIN Block)
    // ══════════════════════════════════════════════════════════════════
    if (request.pinBlock) {
        flowSteps.push('2. Décryptage PIN Block via HSM');
        hsmOperations.push('PIN Block Decryption (3DES/AES)');

        const pinResult = await decryptPinBlock(request.pinBlock, request.pan);
        if (!pinResult.success) {
            console.log(`[ISSUER] PIN decryption failed`);
            const errorResponse: AuthorizationResponse = {
                transactionId: request.transactionId,
                approved: false,
                responseCode: '55', // Incorrect PIN
                message: 'PIN verification failed',
                _educational: { flowSteps, hsmOperations }
            };
            return errorResponse;
        }
        console.log(`[ISSUER] Step 2: PIN Block decrypted successfully`);
    } else {
        flowSteps.push('2. Pas de PIN Block (CNP ou contactless)');
    }

    // ══════════════════════════════════════════════════════════════════
    // STEP 3: Verify Account (Banque → Base Comptes: Vérifie compte)
    // ══════════════════════════════════════════════════════════════════
    flowSteps.push('3. Vérification compte en Base Comptes');
    console.log(`[ISSUER] Step 3: Querying account database...`);

    const account = getAccountByPan(request.pan);
    if (!account) {
        console.log(`[ISSUER] Account not found for PAN`);
        return {
            transactionId: request.transactionId,
            approved: false,
            responseCode: '14', // Invalid card number
            message: 'Card not recognized',
            _educational: { flowSteps, hsmOperations }
        };
    }

    flowSteps.push('   → Informations compte reçues');
    console.log(`[ISSUER] Account found: Balance=${account.balance}, Status=${account.status}`);

    // Check account status
    if (account.status !== 'ACTIVE') {
        console.log(`[ISSUER] Account blocked: ${account.status}`);
        return {
            transactionId: request.transactionId,
            approved: false,
            responseCode: account.status === 'BLOCKED' ? '62' : '78',
            message: `Card ${account.status.toLowerCase()}`,
            _educational: { flowSteps, hsmOperations }
        };
    }

    // ══════════════════════════════════════════════════════════════════
    // STEP 4: Parallel Verifications (Vérifications Parallèles)
    // ══════════════════════════════════════════════════════════════════
    flowSteps.push('4. [Vérifications Parallèles]');
    console.log(`[ISSUER] Step 4: Initiating parallel verifications...`);

    // 4a. Call Fraud Detection (Analyse risque)
    let fraudScore = 0;
    flowSteps.push('   → Détection Fraude: Analyse risque');
    try {
        const fraudCheck = await axios.post(
            `${config.fraudDetection.url}/check`,
            {
                pan: request.pan,
                amount: request.amount,
                merchantId: request.merchantId,
                mcc: request.mcc
            },
            { timeout: config.fraudDetection.timeout }
        );
        fraudScore = fraudCheck.data.riskScore || 0;
        flowSteps.push(`   → Score fraude reçu: ${fraudScore}`);
        console.log(`[FRAUD→ISSUER] Risk score: ${fraudScore}`);

        if (fraudScore > 70) {
            console.log(`[ISSUER] High fraud risk: ${fraudScore}`);
            return {
                transactionId: request.transactionId,
                approved: false,
                responseCode: '59', // Suspected fraud
                message: 'Transaction flagged for review',
                _educational: { flowSteps, hsmOperations }
            };
        }
    } catch (error) {
        console.log(`[ISSUER] Fraud service unavailable, continuing...`);
        flowSteps.push('   → Service Fraude indisponible (continuer)');
    }

    // 4b. Call Auth Engine (Évalue règles)
    flowSteps.push('   → Moteur Autorisation: Évalue règles');
    try {
        const authEngineResponse = await axios.post(
            `${config.authEngine.url}/authorize`,
            {
                pan: request.pan,
                amount: request.amount,
                currency: request.currency,
                merchantId: request.merchantId,
                mcc: request.mcc,
                transactionType: request.transactionType,
                account: {
                    balance: account.balance,
                    dailyLimit: account.dailyLimit,
                    dailySpent: account.dailySpent,
                    monthlyLimit: account.monthlyLimit,
                    monthlySpent: account.monthlySpent
                }
            },
            { timeout: config.authEngine.timeout }
        );

        flowSteps.push(`   → Décision règles: ${authEngineResponse.data.approved ? 'APPROUVÉ' : 'REFUSÉ'}`);
        console.log(`[AUTH→ISSUER] Rules decision: ${authEngineResponse.data.approved ? 'APPROVED' : 'DECLINED'}`);

        if (!authEngineResponse.data.approved) {
            console.log(`[ISSUER] Auth engine declined: ${authEngineResponse.data.responseCode}`);
            return {
                transactionId: request.transactionId,
                approved: false,
                responseCode: authEngineResponse.data.responseCode || '05',
                message: authEngineResponse.data.reason || 'Authorization declined',
                _educational: { flowSteps, hsmOperations }
            };
        }
    } catch (error: any) {
        console.log(`[ISSUER] Auth engine error, using local validation`);
        flowSteps.push('   → Fallback validation locale');

        // Fallback to local validation
        if (account.balance < request.amount) {
            return {
                transactionId: request.transactionId,
                approved: false,
                responseCode: '51',
                message: 'Insufficient funds',
                _educational: { flowSteps, hsmOperations }
            };
        }
    }

    // ══════════════════════════════════════════════════════════════════
    // STEP 5: Final Decision (Prise décision finale)
    // ══════════════════════════════════════════════════════════════════
    flowSteps.push('5. Prise décision finale');
    console.log(`[ISSUER] Step 5: Making final decision...`);

    let finalResponse: AuthorizationResponse;

    if (request.transactionType === 'PURCHASE' || request.transactionType === 'PREAUTH') {
        const debitResult = debitAccount(request.pan, request.amount);
        if (!debitResult.success) {
            console.log(`[ISSUER] Debit failed: ${debitResult.error}`);
            const responseCode = debitResult.error?.includes('Insufficient') ? '51' :
                debitResult.error?.includes('limit') ? '61' : '05';

            return {
                transactionId: request.transactionId,
                approved: false,
                responseCode,
                message: debitResult.error,
                _educational: { flowSteps, hsmOperations }
            };
        }

        console.log(`[ISSUER] Transaction approved, new balance: ${debitResult.newBalance}`);
        finalResponse = {
            transactionId: request.transactionId,
            approved: true,
            responseCode: '00',
            authorizationCode: generateAuthCode(),
            balance: debitResult.newBalance,
            message: 'Approved'
        };

    } else if (request.transactionType === 'REFUND' || request.transactionType === 'CANCEL') {
        const creditResult = creditAccount(request.pan, request.amount);
        if (!creditResult.success) {
            return {
                transactionId: request.transactionId,
                approved: false,
                responseCode: '05',
                message: creditResult.error,
                _educational: { flowSteps, hsmOperations }
            };
        }

        finalResponse = {
            transactionId: request.transactionId,
            approved: true,
            responseCode: '00',
            authorizationCode: generateAuthCode(),
            balance: creditResult.newBalance,
            message: 'Refund approved'
        };
    } else {
        return {
            transactionId: request.transactionId,
            approved: false,
            responseCode: '12', // Invalid transaction
            message: 'Unknown transaction type',
            _educational: { flowSteps, hsmOperations }
        };
    }

    // ══════════════════════════════════════════════════════════════════
    // STEP 6: Sign Response via HSM (Banque → HSM: Génère réponse cryptée)
    // ══════════════════════════════════════════════════════════════════
    flowSteps.push('6. Opérations Sécurité HSM (MAC, Sign, Encrypt, KCV)');
    hsmOperations.push('Response MAC Generation (HMAC-SHA256)');

    const cryptogram = await signAuthorizationResponse(finalResponse);
    finalResponse.cryptogram = cryptogram;
    console.log(`[ISSUER] MAC generated: ${cryptogram.substring(0, 8)}...`);

    // 6a. Calculate KCV
    hsmOperations.push('Calculate KCV (Key Check Value)');
    const kcv = await calculateKcv();
    console.log(`[ISSUER] KCV calculated: ${kcv}`);

    // 6b. Encrypt Sensitive Data
    hsmOperations.push('Encrypt Sensitive Data (TDES)');
    const encryptedData = await encryptSensitiveData(JSON.stringify({ balance: finalResponse.balance }));
    console.log(`[ISSUER] Sensitive data encrypted`);

    // Add to response metadata for educational visibility
    if (!finalResponse._educational) finalResponse._educational = { flowSteps: [], hsmOperations: [] };
    finalResponse._educational.hsmOperations.push(`Encrypted Data: ${encryptedData.substring(0, 10)}...`);
    finalResponse._educational.hsmOperations.push(`KCV: ${kcv}`);

    flowSteps.push('   → Réponse sécurisée (MAC + Données chiffrées)');
    console.log(`[ISSUER] Step 6: Response secured via HSM`);

    // ══════════════════════════════════════════════════════════════════
    // STEP 7: Return ISO 8583 Response (Banque → Réseau: Réponse ISO 8583)
    // ══════════════════════════════════════════════════════════════════
    flowSteps.push('7. Envoi Réponse ISO 8583 au Réseau');
    console.log(`[ISSUER] Step 7: Sending ISO 8583 response to Network`);
    console.log(`[ISSUER] ═══════════════════════════════════════════`);

    // Add educational metadata
    finalResponse._educational = { flowSteps, hsmOperations };

    return finalResponse;
};
