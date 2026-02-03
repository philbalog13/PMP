import { Transaction, AuthorizationResult, TransactionRecord, SimulationScenario, SimulationResult } from '../models';
import { RiskAssessment } from '../engine/RiskEngine';
import { FraudAnalysis } from '../engine/FraudDetector';
import { SignedResponse } from './CryptoService';
/**
 * Extended Authorization Result with full audit trail
 */
export interface FullAuthorizationResult extends AuthorizationResult {
    riskAssessment?: RiskAssessment;
    fraudAnalysis?: FraudAnalysis;
    signedResponse?: SignedResponse;
    _phase5Audit?: {
        step1_ruleEvaluation: string;
        step2_riskScore: number;
        step3_fraudScore: number;
        step4_decision: string;
        step5_responseGenerated: boolean;
        step6_signatureApplied: boolean;
    };
}
/**
 * Authorization Service Class
 * Implements full Phase 5 Authorization Workflow
 */
export declare class AuthorizationService {
    /**
     * Process an authorization request (Full Phase 5 Workflow)
     */
    authorize(transaction: Transaction): Promise<FullAuthorizationResult>;
    /**
     * Make authorization decision based on all factors
     * Implements the decision logic from Phase 5 Step 5.4
     */
    private makeDecision;
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