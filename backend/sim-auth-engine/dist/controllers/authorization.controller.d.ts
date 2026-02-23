/**
 * Authorization Controller
 * Handles authorization requests
 */
import { Request, Response, NextFunction } from 'express';
/**
 * POST /authorize - Process authorization request
 */
export declare const authorize: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * GET /transactions/:pan - Get transaction history
 */
export declare const getTransactions: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * POST /simulate/:scenario - Run simulation scenario
 */
export declare const simulate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * POST /auth/generate-code - Legacy CTF weak auth code endpoint
 */
export declare const generateCode: (_req: Request, res: Response) => Promise<void>;
declare const _default: {
    authorize: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getTransactions: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    simulate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    generateCode: (_req: Request, res: Response) => Promise<void>;
};
export default _default;
//# sourceMappingURL=authorization.controller.d.ts.map