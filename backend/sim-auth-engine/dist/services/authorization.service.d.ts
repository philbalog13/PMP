import { Transaction, AuthorizationResult, TransactionRecord, SimulationScenario, SimulationResult } from '../models';
/**
 * Authorization Service Class
 */
export declare class AuthorizationService {
    /**
     * Process an authorization request
     */
    authorize(transaction: Transaction): Promise<AuthorizationResult>;
    /**
     * Simulate a specific scenario
     */
    simulate(scenario: SimulationScenario): Promise<SimulationResult>;
    /**
     * Get transaction history for a PAN
     */
    getTransactionHistory(pan: string): TransactionRecord[];
    /**
     * Get account information for a PAN
     */
    getAccountInfo(pan: string): {
        card: unknown;
        account: unknown;
    } | null;
    /**
     * Generate authorization code
     */
    private generateAuthCode;
    /**
     * Create error result
     */
    private createErrorResult;
    /**
     * Get scenario configuration
     */
    private getScenarioConfig;
}
export declare const authorizationService: AuthorizationService;
export default authorizationService;
//# sourceMappingURL=authorization.service.d.ts.map