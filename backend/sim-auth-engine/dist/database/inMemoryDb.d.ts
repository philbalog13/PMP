import { Account, Card, TransactionRecord, TransactionHistory, CardStatus } from '../models';
export declare const database: {
    accounts: {
        getById: (id: string) => Account | undefined;
        getByAccountNumber: (accountNumber: string) => Account | undefined;
        getByCardPan: (pan: string) => Account | undefined;
        update: (id: string, updates: Partial<Account>) => Account | undefined;
        updateBalance: (id: string, amount: number) => Account | undefined;
        resetDailyLimits: (id: string) => void;
        getAll: () => Account[];
        create: (account: Account) => Account;
    };
    cards: {
        getByPan: (pan: string) => Card | undefined;
        update: (pan: string, updates: Partial<Card>) => Card | undefined;
        incrementFailedPin: (pan: string) => number;
        resetFailedPin: (pan: string) => void;
        setStatus: (pan: string, status: CardStatus) => Card | undefined;
        getAll: () => Card[];
        isExpired: (card: Card) => boolean;
        isBlacklisted: (pan: string) => boolean;
    };
    transactions: {
        getByPan: (pan: string) => TransactionRecord[];
        add: (pan: string, transaction: TransactionRecord) => void;
        getHistory: (pan: string) => TransactionHistory;
        getAll: () => Map<string, TransactionRecord[]>;
    };
    reset: () => void;
};
export default database;
//# sourceMappingURL=inMemoryDb.d.ts.map