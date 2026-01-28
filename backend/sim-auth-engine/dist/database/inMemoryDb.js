"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.database = void 0;
/**
 * In-Memory Database
 * Pedagogical database for accounts, cards, and transactions
 */
const uuid_1 = require("uuid");
const dayjs_1 = __importDefault(require("dayjs"));
// ===========================================
// Sample Data - Pedagogical Accounts & Cards
// ===========================================
/**
 * Sample accounts database
 */
const accounts = new Map([
    ['ACC001', {
            id: 'ACC001',
            accountNumber: 'FR7630001007941234567890185',
            holderName: 'Jean Dupont',
            balance: 5000.00,
            availableBalance: 4800.00,
            currency: 'EUR',
            accountType: 'CHECKING',
            status: 'ACTIVE',
            dailyLimit: 5000,
            singleTxnLimit: 2000,
            monthlyLimit: 15000,
            dailySpent: 200,
            monthlySpent: 1500,
            dailyTxnCount: 2,
            lastDailyReset: (0, dayjs_1.default)().startOf('day').toDate(),
            lastMonthlyReset: (0, dayjs_1.default)().startOf('month').toDate(),
            overdraftAllowed: true,
            overdraftLimit: 500,
            createdAt: (0, dayjs_1.default)().subtract(2, 'year').toDate(),
            lastActivity: (0, dayjs_1.default)().subtract(1, 'day').toDate(),
        }],
    ['ACC002', {
            id: 'ACC002',
            accountNumber: 'FR7630001007949876543210285',
            holderName: 'Marie Martin',
            balance: 150.00,
            availableBalance: 150.00,
            currency: 'EUR',
            accountType: 'CHECKING',
            status: 'ACTIVE',
            dailyLimit: 3000,
            singleTxnLimit: 1000,
            monthlyLimit: 10000,
            dailySpent: 0,
            monthlySpent: 500,
            dailyTxnCount: 0,
            lastDailyReset: (0, dayjs_1.default)().startOf('day').toDate(),
            lastMonthlyReset: (0, dayjs_1.default)().startOf('month').toDate(),
            overdraftAllowed: false,
            overdraftLimit: 0,
            createdAt: (0, dayjs_1.default)().subtract(1, 'year').toDate(),
            lastActivity: (0, dayjs_1.default)().subtract(5, 'day').toDate(),
        }],
    ['ACC003', {
            id: 'ACC003',
            accountNumber: 'FR7630001007945555666677785',
            holderName: 'Pierre Durand',
            balance: 25000.00,
            availableBalance: 25000.00,
            currency: 'EUR',
            accountType: 'SAVINGS',
            status: 'ACTIVE',
            dailyLimit: 10000,
            singleTxnLimit: 5000,
            monthlyLimit: 50000,
            dailySpent: 0,
            monthlySpent: 0,
            dailyTxnCount: 0,
            lastDailyReset: (0, dayjs_1.default)().startOf('day').toDate(),
            lastMonthlyReset: (0, dayjs_1.default)().startOf('month').toDate(),
            overdraftAllowed: false,
            overdraftLimit: 0,
            createdAt: (0, dayjs_1.default)().subtract(3, 'year').toDate(),
            lastActivity: (0, dayjs_1.default)().subtract(30, 'day').toDate(),
        }],
    ['ACC004', {
            id: 'ACC004',
            accountNumber: 'FR7630001007941111222233385',
            holderName: 'Sophie Bernard',
            balance: 0,
            availableBalance: 0,
            currency: 'EUR',
            accountType: 'CHECKING',
            status: 'BLOCKED',
            dailyLimit: 2000,
            singleTxnLimit: 500,
            monthlyLimit: 5000,
            dailySpent: 0,
            monthlySpent: 0,
            dailyTxnCount: 0,
            lastDailyReset: (0, dayjs_1.default)().startOf('day').toDate(),
            lastMonthlyReset: (0, dayjs_1.default)().startOf('month').toDate(),
            overdraftAllowed: false,
            overdraftLimit: 0,
            createdAt: (0, dayjs_1.default)().subtract(6, 'month').toDate(),
            lastActivity: (0, dayjs_1.default)().subtract(60, 'day').toDate(),
        }],
]);
/**
 * Sample cards database
 */
const cards = new Map([
    // Carte VISA normale - Jean Dupont
    ['4111111111111111', {
            pan: '4111111111111111',
            maskedPan: '411111****1111',
            expiryDate: '1228', // Valid until Dec 2028
            status: 'ACTIVE',
            cardType: 'DEBIT',
            network: 'VISA',
            cardholderName: 'JEAN DUPONT',
            cvv: '123',
            pinHash: 'hashed_1234',
            threeDsEnrolled: true,
            contactlessEnabled: true,
            internationalEnabled: true,
            ecommerceEnabled: true,
            accountId: 'ACC001',
            issueDate: (0, dayjs_1.default)().subtract(1, 'year').toDate(),
            lastUsedDate: (0, dayjs_1.default)().subtract(1, 'day').toDate(),
            failedPinAttempts: 0,
            pinBlocked: false,
        }],
    // Carte avec solde faible - Marie Martin
    ['4000056655665556', {
            pan: '4000056655665556',
            maskedPan: '400005****5556',
            expiryDate: '1227',
            status: 'ACTIVE',
            cardType: 'DEBIT',
            network: 'VISA',
            cardholderName: 'MARIE MARTIN',
            cvv: '456',
            pinHash: 'hashed_5678',
            threeDsEnrolled: true,
            contactlessEnabled: true,
            internationalEnabled: false,
            ecommerceEnabled: true,
            accountId: 'ACC002',
            issueDate: (0, dayjs_1.default)().subtract(6, 'month').toDate(),
            lastUsedDate: (0, dayjs_1.default)().subtract(5, 'day').toDate(),
            failedPinAttempts: 0,
            pinBlocked: false,
        }],
    // Carte Mastercard premium - Pierre Durand
    ['5555555555554444', {
            pan: '5555555555554444',
            maskedPan: '555555****4444',
            expiryDate: '1229',
            status: 'ACTIVE',
            cardType: 'CREDIT',
            network: 'MASTERCARD',
            cardholderName: 'PIERRE DURAND',
            cvv: '789',
            pinHash: 'hashed_9012',
            threeDsEnrolled: true,
            contactlessEnabled: true,
            internationalEnabled: true,
            ecommerceEnabled: true,
            accountId: 'ACC003',
            issueDate: (0, dayjs_1.default)().subtract(2, 'year').toDate(),
            lastUsedDate: (0, dayjs_1.default)().subtract(30, 'day').toDate(),
            failedPinAttempts: 0,
            pinBlocked: false,
        }],
    // Carte expirée
    ['4532015112830366', {
            pan: '4532015112830366',
            maskedPan: '453201****0366',
            expiryDate: '0123', // Expired Jan 2023
            status: 'EXPIRED',
            cardType: 'DEBIT',
            network: 'VISA',
            cardholderName: 'JEAN DUPONT',
            cvv: '321',
            pinHash: 'hashed_expired',
            threeDsEnrolled: false,
            contactlessEnabled: false,
            internationalEnabled: false,
            ecommerceEnabled: false,
            accountId: 'ACC001',
            issueDate: (0, dayjs_1.default)().subtract(5, 'year').toDate(),
            failedPinAttempts: 0,
            pinBlocked: false,
        }],
    // Carte volée (blacklist)
    ['4916338506082832', {
            pan: '4916338506082832',
            maskedPan: '491633****2832',
            expiryDate: '1226',
            status: 'STOLEN',
            cardType: 'DEBIT',
            network: 'VISA',
            cardholderName: 'SOPHIE BERNARD',
            cvv: '654',
            pinHash: 'hashed_stolen',
            threeDsEnrolled: false,
            contactlessEnabled: false,
            internationalEnabled: false,
            ecommerceEnabled: false,
            accountId: 'ACC004',
            issueDate: (0, dayjs_1.default)().subtract(1, 'year').toDate(),
            failedPinAttempts: 0,
            pinBlocked: false,
        }],
    // Carte avec PIN bloqué
    ['5105105105105100', {
            pan: '5105105105105100',
            maskedPan: '510510****5100',
            expiryDate: '1227',
            status: 'ACTIVE',
            cardType: 'DEBIT',
            network: 'MASTERCARD',
            cardholderName: 'PAUL LEFEBVRE',
            cvv: '987',
            pinHash: 'hashed_blocked',
            threeDsEnrolled: true,
            contactlessEnabled: true,
            internationalEnabled: true,
            ecommerceEnabled: true,
            accountId: 'ACC001',
            issueDate: (0, dayjs_1.default)().subtract(8, 'month').toDate(),
            lastUsedDate: (0, dayjs_1.default)().subtract(2, 'day').toDate(),
            failedPinAttempts: 3,
            pinBlocked: true,
        }],
]);
/**
 * Transaction history database
 */
const transactions = new Map();
// Initialize some sample transactions
transactions.set('4111111111111111', [
    {
        id: (0, uuid_1.v4)(),
        stan: '000001',
        maskedPan: '411111****1111',
        amount: 45.50,
        currency: 'EUR',
        type: 'PURCHASE',
        status: 'APPROVED',
        responseCode: '00',
        authorizationCode: 'AUTH01',
        merchantId: 'MERCH001',
        mcc: '5411',
        location: 'Paris, FR',
        timestamp: (0, dayjs_1.default)().subtract(1, 'day').toDate(),
        matchedRules: [],
    },
    {
        id: (0, uuid_1.v4)(),
        stan: '000002',
        maskedPan: '411111****1111',
        amount: 120.00,
        currency: 'EUR',
        type: 'PURCHASE',
        status: 'APPROVED',
        responseCode: '00',
        authorizationCode: 'AUTH02',
        merchantId: 'MERCH002',
        mcc: '5912',
        location: 'Paris, FR',
        timestamp: (0, dayjs_1.default)().subtract(2, 'day').toDate(),
        matchedRules: [],
    },
]);
// ===========================================
// Database Operations
// ===========================================
exports.database = {
    // Account operations
    accounts: {
        getById: (id) => accounts.get(id),
        getByAccountNumber: (accountNumber) => {
            for (const account of accounts.values()) {
                if (account.accountNumber === accountNumber)
                    return account;
            }
            return undefined;
        },
        getByCardPan: (pan) => {
            const card = cards.get(pan);
            if (!card)
                return undefined;
            return accounts.get(card.accountId);
        },
        update: (id, updates) => {
            const account = accounts.get(id);
            if (!account)
                return undefined;
            const updated = { ...account, ...updates };
            accounts.set(id, updated);
            return updated;
        },
        updateBalance: (id, amount) => {
            const account = accounts.get(id);
            if (!account)
                return undefined;
            account.balance -= amount;
            account.availableBalance -= amount;
            account.dailySpent += amount;
            account.monthlySpent += amount;
            account.dailyTxnCount += 1;
            account.lastActivity = new Date();
            return account;
        },
        resetDailyLimits: (id) => {
            const account = accounts.get(id);
            if (account) {
                account.dailySpent = 0;
                account.dailyTxnCount = 0;
                account.lastDailyReset = new Date();
            }
        },
        getAll: () => Array.from(accounts.values()),
        create: (account) => {
            accounts.set(account.id, account);
            return account;
        },
    },
    // Card operations
    cards: {
        getByPan: (pan) => cards.get(pan),
        update: (pan, updates) => {
            const card = cards.get(pan);
            if (!card)
                return undefined;
            const updated = { ...card, ...updates };
            cards.set(pan, updated);
            return updated;
        },
        incrementFailedPin: (pan) => {
            const card = cards.get(pan);
            if (!card)
                return 0;
            card.failedPinAttempts += 1;
            if (card.failedPinAttempts >= 3) {
                card.pinBlocked = true;
            }
            return card.failedPinAttempts;
        },
        resetFailedPin: (pan) => {
            const card = cards.get(pan);
            if (card) {
                card.failedPinAttempts = 0;
                card.pinBlocked = false;
            }
        },
        setStatus: (pan, status) => {
            const card = cards.get(pan);
            if (!card)
                return undefined;
            card.status = status;
            return card;
        },
        getAll: () => Array.from(cards.values()),
        isExpired: (card) => {
            const month = parseInt(card.expiryDate.substring(0, 2));
            const year = parseInt('20' + card.expiryDate.substring(2, 4));
            const expiryDate = new Date(year, month, 0); // Last day of expiry month
            return new Date() > expiryDate;
        },
        isBlacklisted: (pan) => {
            const card = cards.get(pan);
            return card?.status === 'STOLEN' || card?.status === 'LOST';
        },
    },
    // Transaction operations
    transactions: {
        getByPan: (pan) => {
            return transactions.get(pan) || [];
        },
        add: (pan, transaction) => {
            const history = transactions.get(pan) || [];
            history.unshift(transaction); // Add to beginning
            // Keep only last 100 transactions
            if (history.length > 100) {
                history.pop();
            }
            transactions.set(pan, history);
        },
        getHistory: (pan) => {
            const txns = transactions.get(pan) || [];
            const thirtyDaysAgo = (0, dayjs_1.default)().subtract(30, 'day').toDate();
            const recentTxns = txns.filter(t => t.timestamp > thirtyDaysAgo);
            const merchants = new Set(recentTxns.map(t => t.merchantId));
            const countries = new Set(recentTxns.map(t => t.location?.split(',').pop()?.trim() || 'Unknown'));
            return {
                recentTransactions: recentTxns,
                totalCount: recentTxns.length,
                totalApprovedAmount: recentTxns
                    .filter(t => t.status === 'APPROVED')
                    .reduce((sum, t) => sum + t.amount, 0),
                declinedCount: recentTxns.filter(t => t.status === 'DECLINED').length,
                lastTransactionDate: recentTxns[0]?.timestamp,
                distinctMerchants: merchants.size,
                distinctCountries: Array.from(countries),
            };
        },
        getAll: () => transactions,
    },
    // Utility
    reset: () => {
        // Reset to initial state (for testing)
        accounts.forEach((account) => {
            account.dailySpent = 0;
            account.dailyTxnCount = 0;
            account.monthlySpent = 0;
        });
    },
};
exports.default = exports.database;
//# sourceMappingURL=inMemoryDb.js.map