/**
 * Authorization Service
 * Main authorization processing service
 */
import { v4 as uuidv4 } from 'uuid';
import {
    Transaction,
    AuthorizationContext,
    AuthorizationResult,
    TransactionRecord,
    SimulationScenario,
    SimulationResult,
} from '../models';
import { database } from '../database';
import { rulesEngine } from './rulesEngine.service';

/**
 * Authorization Service Class
 */
export class AuthorizationService {
    /**
     * Process an authorization request
     */
    async authorize(transaction: Transaction): Promise<AuthorizationResult> {
        const startTime = Date.now();

        try {
            // 1. Get card and account
            const card = database.cards.getByPan(transaction.pan);
            if (!card) {
                return this.createErrorResult('14', 'Invalid card number', startTime);
            }

            const account = database.accounts.getById(card.accountId);
            if (!account) {
                return this.createErrorResult('96', 'Account not found', startTime);
            }

            // 2. Get transaction history
            const history = database.transactions.getHistory(transaction.pan);

            // 3. Build authorization context
            const context: AuthorizationContext = {
                transaction,
                card,
                account,
                history,
                timestamp: new Date(),
            };

            // 4. Evaluate rules
            const matchedRules = rulesEngine.evaluate(context);
            const decision = rulesEngine.getDecision(matchedRules);

            // 5. Build result
            const result: AuthorizationResult = {
                approved: decision.action === 'APPROVE',
                responseCode: decision.responseCode,
                responseMessage: decision.responseMessage,
                authorizationCode: decision.action === 'APPROVE' ? this.generateAuthCode() : undefined,
                matchedRules,
                processingTime: Date.now() - startTime,
                timestamp: new Date(),
            };

            // 6. If approved, update account balance
            if (result.approved && transaction.type !== 'BALANCE_INQUIRY') {
                database.accounts.updateBalance(account.id, transaction.amount);
                database.cards.update(transaction.pan, { lastUsedDate: new Date() });
            }

            // 7. Record transaction
            const txnRecord: TransactionRecord = {
                id: uuidv4(),
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

            database.transactions.add(transaction.pan, txnRecord);

            return result;

        } catch (error) {
            return this.createErrorResult(
                '96',
                error instanceof Error ? error.message : 'System error',
                startTime
            );
        }
    }

    /**
     * Simulate a specific scenario
     */
    async simulate(scenario: SimulationScenario): Promise<SimulationResult> {
        const scenarioConfig = this.getScenarioConfig(scenario);

        // Create test transaction based on scenario
        const transaction: Transaction = {
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

        // Process authorization
        const result = await this.authorize(transaction);

        // Return simulation result
        return {
            ...result,
            scenario,
            description: scenarioConfig.description,
        };
    }

    /**
     * Get transaction history for a PAN
     */
    getTransactionHistory(pan: string): TransactionRecord[] {
        return database.transactions.getByPan(pan);
    }

    /**
     * Get account information for a PAN
     */
    getAccountInfo(pan: string): { card: unknown; account: unknown } | null {
        const card = database.cards.getByPan(pan);
        if (!card) return null;

        const account = database.accounts.getById(card.accountId);
        if (!account) return null;

        // Return sanitized info (no sensitive data)
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
    private generateAuthCode(): string {
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
    private createErrorResult(
        responseCode: string,
        message: string,
        startTime: number
    ): AuthorizationResult {
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
    private getScenarioConfig(scenario: SimulationScenario): {
        pan: string;
        amount: number;
        description: string;
        threeDsAuth: boolean;
        isEcommerce: boolean;
        location?: { country: string; city?: string };
    } {
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
                    pan: '4000056655665556', // Low balance account
                    amount: 500.00, // More than balance (150 EUR)
                    description: 'Insufficient funds - amount exceeds balance',
                    threeDsAuth: false,
                    isEcommerce: false,
                };

            case 'EXPIRED_CARD':
                return {
                    pan: '4532015112830366', // Expired card
                    amount: 50.00,
                    description: 'Transaction with expired card',
                    threeDsAuth: false,
                    isEcommerce: false,
                };

            case 'STOLEN_CARD':
                return {
                    pan: '4916338506082832', // Stolen card
                    amount: 50.00,
                    description: 'Transaction with stolen card (blacklist)',
                    threeDsAuth: false,
                    isEcommerce: false,
                };

            case 'OVER_LIMIT':
                return {
                    pan: '4111111111111111',
                    amount: 3000.00, // Above single txn limit (2000)
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
                    amount: 750.00, // Above 3DS threshold (500)
                    description: 'E-commerce transaction requiring 3DS',
                    threeDsAuth: false, // Not authenticated
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
                    pan: '0000000000000000', // Invalid PAN
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

// Export singleton
export const authorizationService = new AuthorizationService();
export default authorizationService;
