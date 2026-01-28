/**
 * Rules Controller
 * Handles rule management
 */
import { Request, Response, NextFunction } from 'express';
export declare const getRules: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getRuleById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const updateRule: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const createRule: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteRule: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const importRules: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getMetrics: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=rules.controller.d.ts.map