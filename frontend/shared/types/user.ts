/**
 * Shared User Types
 * Authentication and user-related type definitions
 */

/**
 * User roles in the PMP platform
 */
export enum UserRole {
    CLIENT = 'ROLE_CLIENT',
    MARCHAND = 'ROLE_MARCHAND',
    ETUDIANT = 'ROLE_ETUDIANT',
    FORMATEUR = 'ROLE_FORMATEUR'
}

/**
 * User permissions
 */
export enum Permission {
    // Client permissions
    VIEW_OWN_CARDS = 'VIEW_OWN_CARDS',
    EXECUTE_TRANSACTION = 'EXECUTE_TRANSACTION',
    VIEW_OWN_HISTORY = 'VIEW_OWN_HISTORY',

    // Merchant permissions
    MANAGE_POS = 'MANAGE_POS',
    VIEW_POS_TRANSACTIONS = 'VIEW_POS_TRANSACTIONS',
    GENERATE_REPORTS = 'GENERATE_REPORTS',

    // Student permissions
    ACCESS_LAB = 'ACCESS_LAB',
    USE_SIMULATORS = 'USE_SIMULATORS',
    VIEW_PROGRESS = 'VIEW_PROGRESS',

    // Trainer permissions
    MANAGE_EXERCISES = 'MANAGE_EXERCISES',
    MONITOR_ALL = 'MONITOR_ALL',
    FULL_ACCESS = 'FULL_ACCESS'
}

/**
 * User interface
 */
export interface User {
    id: string;
    email: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    role: UserRole;
    permissions: Permission[];
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * Authentication state
 */
export interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
    email: string;
    password: string;
    role?: UserRole;
}

/**
 * Login response
 */
export interface LoginResponse {
    success: boolean;
    token?: string;
    user?: User;
    message?: string;
}
