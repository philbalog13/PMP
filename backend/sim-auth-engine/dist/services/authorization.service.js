"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizationService = exports.AuthorizationService = void 0;
/**
 * Authorization Service
 * Main authorization processing service
 * 100% Conformant to Phase 5: Évaluation → Risque → Fraude → Décision → Signature
 */
const uuid_1 = require("uuid");
const database_1 = require("../database");
const rulesEngine_service_1 = require("./rulesEngine.service");
const RiskEngine_1 = require("../engine/RiskEngine");
const FraudDetector_1 = require("../engine/FraudDetector");
const CryptoService_1 = require("./CryptoService");
/**
 * Authorization Service Class
 * Implements full Phase 5 Authorization Workflow
 */
class AuthorizationService {
    /**
     * Process an authorization request (Full Phase 5 Workflow)
     */
    async authorize(transaction) {
        const startTime = Date.now();
        console.log(`\n[AUTH ENGINE] ════════════════════════════════════════════`);
        console.log(`[AUTH ENGINE] 🔐 PHASE 5: AUTHORIZATION WORKFLOW`);
        console.log(`[AUTH ENGINE] Transaction: ${transaction.stan}`);
        try {
            // ══════════════════════════════════════════════════════════════════
            // STEP 0: Get card, account, and build context
            // ══════════════════════════════════════════════════════════════════
            const card = database_1.database.cards.getByPan(transaction.pan);
            if (!card) {
                return this.createErrorResult('14', 'Invalid card number', startTime);
            }
            const account = database_1.database.accounts.getById(card.accountId);
            if (!account) {
                return this.createErrorResult('96', 'Account not found', startTime);
            }
            const history = database_1.database.transactions.getHistory(transaction.pan);
            const context = {
                transaction,
                card,
                account,
                history,
                timestamp: new Date(),
            };
            // ══════════════════════════════════════════════════════════════════
            // STEP 5.1: Évaluation des règles métier
            // ══════════════════════════════════════════════════════════════════
            console.log(`[AUTH ENGINE] Step 5.1: Evaluating business rules...`);
            const matchedRules = rulesEngine_service_1.rulesEngine.evaluate(context);
            const ruleDecision = rulesEngine_service_1.rulesEngine.getDecision(matchedRules);
            console.log(`[AUTH ENGINE] → Rules matched: ${matchedRules.length}, Decision: ${ruleDecision.action}`);
            // ══════════════════════════════════════════════════════════════════
            // STEP 5.2: Calcul score risque
            // ══════════════════════════════════════════════════════════════════
            console.log(`[AUTH ENGINE] Step 5.2: Calculating risk score...`);
            const riskAssessment = RiskEngine_1.riskEngine.calculateRisk(context);
            console.log(`[AUTH ENGINE] → Risk: ${riskAssessment.overallScore} (${riskAssessment.riskLevel})`);
            // ══════════════════════════════════════════════════════════════════
            // STEP 5.3: Détection fraude IA
            // ══════════════════════════════════════════════════════════════════
            console.log(`[AUTH ENGINE] Step 5.3: Running AI fraud detection...`);
            const fraudAnalysis = await FraudDetector_1.fraudDetector.analyze(context);
            console.log(`[AUTH ENGINE] → Fraud score: ${(fraudAnalysis.fraudScore * 100).toFixed(1)}%`);
            // ══════════════════════════════════════════════════════════════════
            // STEP 5.4: Prise de décision (Decision Making)
            // ══════════════════════════════════════════════════════════════════
            console.log(`[AUTH ENGINE] Step 5.4: Making authorization decision...`);
            const decision = this.makeDecision({
                rules: matchedRules,
                ruleDecision,
                risk: riskAssessment,
                fraud: fraudAnalysis,
                transaction
            });
            console.log(`[AUTH ENGINE] → Decision: ${decision.approved ? 'APPROVED' : 'DECLINED'} (${decision.code})`);
            // ══════════════════════════════════════════════════════════════════
            // STEP 5.5: Génération réponse
            // ══════════════════════════════════════════════════════════════════
            console.log(`[AUTH ENGINE] Step 5.5: Generating response...`);
            const result = {
                approved: decision.approved,
                responseCode: decision.code,
                responseMessage: decision.reason,
                authorizationCode: decision.approved ? this.generateAuthCode() : undefined,
                matchedRules,
                riskAssessment,
                fraudAnalysis,
                processingTime: Date.now() - startTime,
                timestamp: new Date(),
            };
            // ══════════════════════════════════════════════════════════════════
            // STEP 5.6: Signature cryptographique
            // ══════════════════════════════════════════════════════════════════
            console.log(`[AUTH ENGINE] Step 5.6: Signing response cryptographically...`);
            const signedResponse = await CryptoService_1.cryptoService.sign({
                transactionId: transaction.stan,
                approved: result.approved,
                responseCode: result.responseCode,
                authorizationCode: result.authorizationCode,
                timestamp: result.timestamp
            });
            result.signedResponse = signedResponse;
            console.log(`[AUTH ENGINE] → Signature applied: ${signedResponse.signature.substring(0, 16)}...`);
            // Add Phase 5 audit trail
            result._phase5Audit = {
                step1_ruleEvaluation: `${matchedRules.length} rules evaluated`,
                step2_riskScore: riskAssessment.overallScore,
                step3_fraudScore: Math.round(fraudAnalysis.fraudScore * 100),
                step4_decision: decision.approved ? 'APPROVED' : `DECLINED:${decision.code}`,
                step5_responseGenerated: true,
                step6_signatureApplied: true
            };
            // If approved, update account balance
            if (result.approved && transaction.type !== 'BALANCE_INQUIRY') {
                database_1.database.accounts.updateBalance(account.id, transaction.amount);
                database_1.database.cards.update(transaction.pan, { lastUsedDate: new Date() });
            }
            // Record transaction
            const txnRecord = {
                id: (0, uuid_1.v4)(),
                stan: transaction.stan,
                maskedPan: card.maskedPan,
                amount: transaction.amount,
                currency: transaction.currency,
                type: transaction.type,
                status: result.approved ? 'APPROVED' : 'DECLINED',
                responseCode: result.responseCode,
                authorizationCode: result.authorizationCode,
                merchantId: transaction.merchantId,
                mcc: transaction.mcc,
                location: transaction.location ?
                    `${transaction.location.city || ''}, ${transaction.location.country}` : undefined,
                timestamp: new Date(),
                matchedRules: matchedRules.map(r => r.ruleId),
            };
            database_1.database.transactions.add(transaction.pan, txnRecord);
            console.log(`[AUTH ENGINE] ════════════════════════════════════════════`);
            console.log(`[AUTH ENGINE] ✅ Authorization complete in ${Date.now() - startTime}ms\n`);
            return result;
        }
        catch (error) {
            return this.createErrorResult('96', error instanceof Error ? error.message : 'System error', startTime);
        }
    }
    /**
     * Make authorization decision based on all factors
     * Implements the decision logic from Phase 5 Step 5.4
     */
    makeDecision(factors) {
        // Priority 1: Fraud detection
        if (factors.fraud.fraudScore > 0.8) {
            return { approved: false, code: '59', reason: 'Fraude suspectée (AI détection)' };
        }
        // Priority 2: High risk score
        if (factors.risk.riskLevel === 'CRITICAL') {
            return { approved: false, code: '57', reason: 'Risque critique détecté' };
        }
        if (factors.risk.overallScore > 70) {
            return { approved: false, code: '51', reason: 'Score risque élevé' };
        }
        // Priority 3: Business rules
        if (factors.ruleDecision.action === 'DENY') {
            return {
                approved: false,
                code: factors.ruleDecision.responseCode,
                reason: factors.ruleDecision.responseMessage
            };
        }
        // Priority 4: Medium fraud with high risk = decline
        if (factors.fraud.fraudScore > 0.5 && factors.risk.overallScore > 50) {
            return { approved: false, code: '57', reason: 'Combinaison risque/fraude suspecte' };
        }
        // All checks passed
        return {
            approved: true,
            code: '00',
            reason: 'Transaction approuvée'
        };
    }
    /**
     * Simulate a specific scenario
     */
    async simulate(scenario) {
        const scenarioConfig = this.getScenarioConfig(scenario);
        const transaction = {
            stan: `SIM${Date.now()}`,
            pan: scenarioConfig.pan,
            mti: '0100',
            processingCode: '000000',
            amount: scenarioConfig.amount,
            currency: 'EUR',
            type: 'PURCHASE',
            merchantId: 'SIM_MERCH001',
            terminalId: 'SIM_TERM01',
            mcc: '5411',
            posEntryMode: '051',
            pinEntered: false,
            cvvProvided: false,
            threeDsAuthenticated: scenarioConfig.threeDsAuth,
            isRecurring: false,
            isEcommerce: scenarioConfig.isEcommerce,
            location: scenarioConfig.location,
            timestamp: new Date(),
        };
        const result = await this.authorize(transaction);
        return {
            ...result,
            scenario,
            description: scenarioConfig.description,
        };
    }
    /**
     * Get transaction history for a PAN
     */
    getTransactionHistory(pan) {
        return database_1.database.transactions.getByPan(pan);
    }
    /**
     * Get account information for a PAN
     */
    getAccountInfo(pan) {
        const card = database_1.database.cards.getByPan(pan);
        if (!card)
            return null;
        const account = database_1.database.accounts.getById(card.accountId);
        if (!account)
            return null;
        return {
            card: {
                maskedPan: card.maskedPan,
                expiryDate: card.expiryDate,
                status: card.status,
                cardType: card.cardType,
                network: card.network,
                cardholderName: card.cardholderName,
                threeDsEnrolled: card.threeDsEnrolled,
                contactlessEnabled: card.contactlessEnabled,
                internationalEnabled: card.internationalEnabled,
                ecommerceEnabled: card.ecommerceEnabled,
                pinBlocked: card.pinBlocked,
            },
            account: {
                id: account.id,
                holderName: account.holderName,
                balance: account.balance,
                availableBalance: account.availableBalance,
                currency: account.currency,
                status: account.status,
                dailyLimit: account.dailyLimit,
                singleTxnLimit: account.singleTxnLimit,
                dailySpent: account.dailySpent,
                dailyTxnCount: account.dailyTxnCount,
            },
        };
    }
    /**
     * Generate authorization code
     */
    generateAuthCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
    /**
     * Create error result
     */
    createErrorResult(responseCode, message, startTime) {
        return {
            approved: false,
            responseCode,
            responseMessage: message,
            matchedRules: [],
            processingTime: Date.now() - startTime,
            timestamp: new Date(),
        };
    }
    /**
     * Get scenario configuration
     */
    getScenarioConfig(scenario) {
        switch (scenario) {
            case 'APPROVED':
                return {
                    pan: '4111111111111111',
                    amount: 50.00,
                    description: 'Standard approved transaction',
                    threeDsAuth: true,
                    isEcommerce: false,
                };
            case 'INSUFFICIENT_FUNDS':
                return {
                    pan: '4000056655665556',
                    amount: 500.00,
                    description: 'Insufficient funds - amount exceeds balance',
                    threeDsAuth: false,
                    isEcommerce: false,
                };
            case 'EXPIRED_CARD':
                return {
                    pan: '4532015112830366',
                    amount: 50.00,
                    description: 'Transaction with expired card',
                    threeDsAuth: false,
                    isEcommerce: false,
                };
            case 'STOLEN_CARD':
                return {
                    pan: '4916338506082832',
                    amount: 50.00,
                    description: 'Transaction with stolen card (blacklist)',
                    threeDsAuth: false,
                    isEcommerce: false,
                };
            case 'OVER_LIMIT':
                return {
                    pan: '4111111111111111',
                    amount: 3000.00,
                    description: 'Amount exceeds single transaction limit',
                    threeDsAuth: false,
                    isEcommerce: false,
                };
            case 'VELOCITY_EXCEEDED':
                return {
                    pan: '4111111111111111',
                    amount: 10.00,
                    description: 'Too many transactions in period',
                    threeDsAuth: false,
                    isEcommerce: false,
                };
            case '3DS_REQUIRED':
                return {
                    pan: '4111111111111111',
                    amount: 750.00,
                    description: 'E-commerce transaction requiring 3DS',
                    threeDsAuth: false,
                    isEcommerce: true,
                };
            case 'FRAUD_SUSPECTED':
                return {
                    pan: '4111111111111111',
                    amount: 100.00,
                    description: 'Transaction from high-risk location',
                    threeDsAuth: false,
                    isEcommerce: false,
                    location: { country: 'NK', city: 'Unknown' },
                };
            case 'SYSTEM_ERROR':
                return {
                    pan: '0000000000000000',
                    amount: 50.00,
                    description: 'System error - invalid card',
                    threeDsAuth: false,
                    isEcommerce: false,
                };
            default:
                return {
                    pan: '4111111111111111',
                    amount: 50.00,
                    description: 'Default scenario',
                    threeDsAuth: false,
                    isEcommerce: false,
                };
        }
    }
}
exports.AuthorizationService = AuthorizationService;
// Export singleton
exports.authorizationService = new AuthorizationService();
exports.default = exports.authorizationService;
//# sourceMappingURL=authorization.service.js.map