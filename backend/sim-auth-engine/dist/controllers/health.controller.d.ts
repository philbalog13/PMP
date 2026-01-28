/**
 * Health Controller
 */
import { Request, Response, NextFunction } from 'express';
export declare const health: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const liveness: (req: Request, res: Response) => Promise<void>;
export declare const readiness: (req: Request, res: Response) => Promise<void>;
declare const _default: {
    health: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    liveness: (req: Request, res: Response) => Promise<void>;
    readiness: (req: Request, res: Response) => Promise<void>;
};
export default _default;
//# sourceMappingURL=health.controller.d.ts.map