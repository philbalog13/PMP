/**
 * Routing Service
 * Intelligent routing based on BIN (Bank Identification Number)
 */
import { config } from '../config';
import { logger } from '../utils/logger';
import { recordRoutingDecision } from '../utils/metrics';
import { createCircuitBreaker, executeWithCircuitBreaker } from '../utils/circuitBreaker';
import { createRetryClient } from '../utils/retry';
import {
    CardNetwork,
    TransactionRequest,
    TransactionResponse,
    RoutingDecision,
    BinConfig,
    ResponseCode,
} from '../models';

/**
 * BIN Routing Table (Pedagogical Configuration)
 * First 6 digits of PAN -> Routing Information
 */
const BIN_ROUTING_TABLE: BinConfig[] = [
    // Visa
    { binPrefix: '411111', network: CardNetwork.VISA, issuerCode: 'VISA_FR_001', issuerName: 'Visa France', cardType: 'CREDIT', country: 'FR' },
    { binPrefix: '400005', network: CardNetwork.VISA, issuerCode: 'VISA_FR_002', issuerName: 'Visa France Debit', cardType: 'DEBIT', country: 'FR' },
    { binPrefix: '4', network: CardNetwork.VISA, issuerCode: 'VISA_DEFAULT', issuerName: 'Visa International', cardType: 'CREDIT', country: 'US' },

    // Mastercard
    { binPrefix: '555555', network: CardNetwork.MASTERCARD, issuerCode: 'MC_FR_001', issuerName: 'Mastercard France', cardType: 'CREDIT', country: 'FR' },
    { binPrefix: '51', network: CardNetwork.MASTERCARD, issuerCode: 'MC_DEFAULT', issuerName: 'Mastercard International', cardType: 'CREDIT', country: 'US' },
    { binPrefix: '52', network: CardNetwork.MASTERCARD, issuerCode: 'MC_DEFAULT', issuerName: 'Mastercard International', cardType: 'CREDIT', country: 'US' },
    { binPrefix: '53', network: CardNetwork.MASTERCARD, issuerCode: 'MC_DEFAULT', issuerName: 'Mastercard International', cardType: 'CREDIT', country: 'US' },
    { binPrefix: '54', network: CardNetwork.MASTERCARD, issuerCode: 'MC_DEFAULT', issuerName: 'Mastercard International', cardType: 'CREDIT', country: 'US' },
    { binPrefix: '55', network: CardNetwork.MASTERCARD, issuerCode: 'MC_DEFAULT', issuerName: 'Mastercard International', cardType: 'CREDIT', country: 'US' },

    // American Express
    { binPrefix: '34', network: CardNetwork.AMEX, issuerCode: 'AMEX_001', issuerName: 'American Express', cardType: 'CREDIT', country: 'US' },
    { binPrefix: '37', network: CardNetwork.AMEX, issuerCode: 'AMEX_001', issuerName: 'American Express', cardType: 'CREDIT', country: 'US' },

    // Discover
    { binPrefix: '6011', network: CardNetwork.DISCOVER, issuerCode: 'DISC_001', issuerName: 'Discover', cardType: 'CREDIT', country: 'US' },
    { binPrefix: '65', network: CardNetwork.DISCOVER, issuerCode: 'DISC_001', issuerName: 'Discover', cardType: 'CREDIT', country: 'US' },

    // UnionPay
    { binPrefix: '62', network: CardNetwork.UNIONPAY, issuerCode: 'UP_001', issuerName: 'UnionPay', cardType: 'CREDIT', country: 'CN' },
];

// HTTP clients for external services
const issuerClient = createRetryClient(config.services.issuer);

// Initialize circuit breakers
createCircuitBreaker('issuer-service');

/**
 * Routing Service Class
 */
export class RoutingService {
    /**
     * Identify card network from PAN
     */
    identifyNetwork(pan: string): CardNetwork {
        // Clean PAN
        const cleanPan = pan.replace(/\D/g, '');

        // Find matching BIN (longest prefix match)
        let matchedConfig: BinConfig | null = null;
        let longestMatch = 0;

        for (const binConfig of BIN_ROUTING_TABLE) {
            if (cleanPan.startsWith(binConfig.binPrefix) && binConfig.binPrefix.length > longestMatch) {
                matchedConfig = binConfig;
                longestMatch = binConfig.binPrefix.length;
            }
        }

        if (matchedConfig) {
            logger.debug(`Network identified: ${matchedConfig.network}`, {
                pan: this.maskPan(pan),
                binPrefix: matchedConfig.binPrefix,
            });
            return matchedConfig.network;
        }

        logger.warn(`Unknown card network for PAN: ${this.maskPan(pan)}`);
        return CardNetwork.UNKNOWN;
    }

    /**
     * Get BIN configuration for a PAN
     */
    getBinConfig(pan: string): BinConfig | null {
        const cleanPan = pan.replace(/\D/g, '');

        let matchedConfig: BinConfig | null = null;
        let longestMatch = 0;

        for (const binConfig of BIN_ROUTING_TABLE) {
            if (cleanPan.startsWith(binConfig.binPrefix) && binConfig.binPrefix.length > longestMatch) {
                matchedConfig = binConfig;
                longestMatch = binConfig.binPrefix.length;
            }
        }

        return matchedConfig;
    }

    /**
     * Determine routing decision for transaction
     */
    async determineRoute(transaction: TransactionRequest): Promise<RoutingDecision> {
        const startTime = Date.now();
        const network = this.identifyNetwork(transaction.pan);
        const binConfig = this.getBinConfig(transaction.pan);

        const decision: RoutingDecision = {
            network,
            issuerUrl: config.services.issuer,
            priority: 1,
            routingReason: binConfig
                ? `Routed via ${binConfig.issuerCode} (${binConfig.issuerName})`
                : 'Default routing - unknown BIN',
        };

        // Log routing decision
        logger.info('Routing decision made', {
            pan: this.maskPan(transaction.pan),
            network: decision.network,
            issuer: binConfig?.issuerCode || 'UNKNOWN',
            reason: decision.routingReason,
            duration: Date.now() - startTime,
        });

        // Record metrics
        recordRoutingDecision(
            decision.network,
            binConfig?.issuerCode || 'UNKNOWN',
            network !== CardNetwork.UNKNOWN
        );

        return decision;
    }

    /**
     * Route transaction to issuer
     */
    async routeTransaction(transaction: TransactionRequest): Promise<TransactionResponse> {
        const startTime = Date.now();

        // Determine routing
        const routingDecision = await this.determineRoute(transaction);

        // Check if network is supported
        if (routingDecision.network === CardNetwork.UNKNOWN) {
            return this.createErrorResponse(transaction, '14', routingDecision, startTime);
        }

        try {
            // Send to issuer via circuit breaker
            const response = await executeWithCircuitBreaker<TransactionResponse>(
                'issuer-service',
                {
                    method: 'POST',
                    url: `${routingDecision.issuerUrl}/transaction/authorize`,
                    data: {
                        ...transaction,
                        networkRoutingInfo: {
                            network: routingDecision.network,
                            issuer: routingDecision.issuerUrl,
                            routingReason: routingDecision.routingReason,
                        },
                    },
                    timeout: config.timeout,
                }
            );

            const responseTime = Date.now() - startTime;

            logger.info('Transaction routed successfully', {
                stan: transaction.stan,
                pan: this.maskPan(transaction.pan),
                network: routingDecision.network,
                responseCode: response.data.responseCode,
                responseTime,
            });

            return {
                ...response.data,
                networkId: routingDecision.network,
                issuerRoutingInfo: routingDecision.routingReason,
                responseTime,
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            logger.error('Failed to route transaction', {
                stan: transaction.stan,
                pan: this.maskPan(transaction.pan),
                error: errorMessage,
            });

            // Return appropriate error response
            const responseCode = errorMessage.includes('circuit breaker') ? '91' : '96';
            return this.createErrorResponse(transaction, responseCode as ResponseCode, routingDecision, startTime);
        }
    }

    /**
     * Create error response
     */
    private createErrorResponse(
        transaction: TransactionRequest,
        responseCode: ResponseCode,
        routingDecision: RoutingDecision,
        startTime: number
    ): TransactionResponse {
        const responseMessages: Record<string, string> = {
            '14': 'Invalid card number',
            '91': 'Issuer unavailable',
            '96': 'System malfunction',
        };

        return {
            stan: transaction.stan,
            acquirerReferenceNumber: transaction.acquirerReferenceNumber,
            responseCode,
            responseMessage: responseMessages[responseCode] || 'Error',
            networkId: routingDecision.network,
            issuerRoutingInfo: routingDecision.routingReason,
            processedAt: new Date().toISOString(),
            responseTime: Date.now() - startTime,
        };
    }

    /**
     * Mask PAN for logging (show first 6 and last 4)
     */
    private maskPan(pan: string): string {
        const cleanPan = pan.replace(/\D/g, '');
        if (cleanPan.length < 13) return '****';
        return `${cleanPan.slice(0, 6)}****${cleanPan.slice(-4)}`;
    }

    /**
     * Get all supported networks
     */
    getSupportedNetworks(): CardNetwork[] {
        return [
            CardNetwork.VISA,
            CardNetwork.MASTERCARD,
            CardNetwork.AMEX,
            CardNetwork.DISCOVER,
            CardNetwork.UNIONPAY,
        ];
    }

    /**
     * Get BIN table (for admin/debug)
     */
    getBinTable(): BinConfig[] {
        return BIN_ROUTING_TABLE;
    }
}

// Export singleton instance
export const routingService = new RoutingService();
export default routingService;
