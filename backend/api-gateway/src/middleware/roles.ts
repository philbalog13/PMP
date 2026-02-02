/**
 * Roles and Permissions System - PMP
 */
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * 4 Primary Roles (Personas)
 */
export enum UserRole {
    CLIENT = 'ROLE_CLIENT',
    MARCHAND = 'ROLE_MARCHAND',
    ETUDIANT = 'ROLE_ETUDIANT',
    FORMATEUR = 'ROLE_FORMATEUR',
}

/**
 * Specific Permissions
 */
export enum Permission {
    // Client Permissions
    VIEW_OWN_CARDS = 'VIEW_OWN_CARDS',
    EXECUTE_TRANSACTION = 'EXECUTE_TRANSACTION',
    VIEW_OWN_HISTORY = 'VIEW_OWN_HISTORY',

    // Merchant Permissions
    MANAGE_POS = 'MANAGE_POS',
    VIEW_POS_TRANSACTIONS = 'VIEW_POS_TRANSACTIONS',
    GENERATE_REPORTS = 'GENERATE_REPORTS',

    // Student Permissions
    ACCESS_LAB = 'ACCESS_LAB',
    USE_SIMULATORS = 'USE_SIMULATORS',
    VIEW_PROGRESS = 'VIEW_PROGRESS',

    // Trainer Permissions
    MANAGE_EXERCISES = 'MANAGE_EXERCISES',
    MONITOR_ALL = 'MONITOR_ALL',
    FULL_ACCESS = 'FULL_ACCESS',
}

/**
 * Permission Matrix
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
    [UserRole.CLIENT]: [
        Permission.VIEW_OWN_CARDS,
        Permission.EXECUTE_TRANSACTION,
        Permission.VIEW_OWN_HISTORY,
    ],
    [UserRole.MARCHAND]: [
        Permission.MANAGE_POS,
        Permission.VIEW_POS_TRANSACTIONS,
        Permission.GENERATE_REPORTS,
    ],
    [UserRole.ETUDIANT]: [
        Permission.ACCESS_LAB,
        Permission.USE_SIMULATORS,
        Permission.VIEW_PROGRESS,
    ],
    [UserRole.FORMATEUR]: [
        Permission.MANAGE_EXERCISES,
        Permission.MONITOR_ALL,
        Permission.FULL_ACCESS,
        // Inherit all (optional but explicit here)
        Permission.ACCESS_LAB,
        Permission.USE_SIMULATORS,
        Permission.VIEW_OWN_CARDS,
        Permission.MANAGE_POS,
    ],
};

/**
 * TypeScript Decorator-like wrappers for Express
 */

/**
 * Require a specific role
 */
export const RequireRole = (role: UserRole) => {
    return (req: any, res: Response, next: NextFunction) => {
        if (!req.user || req.user.role !== role) {
            logger.warn(`[RBAC_DENIED] Role required: ${role}, user role: ${req.user?.role}`);
            return res.status(403).json({
                success: false,
                error: `Access denied. Role ${role} required.`,
                code: 'FORBIDDEN_ROLE'
            });
        }
        next();
    };
};

/**
 * Require a specific permission
 */
export const RequirePermission = (permission: Permission) => {
    return (req: any, res: Response, next: NextFunction) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const userPermissions = ROLE_PERMISSIONS[req.user.role as UserRole] || [];

        if (!userPermissions.includes(permission) && !userPermissions.includes(Permission.FULL_ACCESS)) {
            logger.warn(`[RBAC_DENIED] Permission required: ${permission}, user role: ${req.user.role}`);
            return res.status(403).json({
                success: false,
                error: `Access denied. Missing permission: ${permission}`,
                code: 'FORBIDDEN_PERMISSION'
            });
        }
        next();
    };
};
