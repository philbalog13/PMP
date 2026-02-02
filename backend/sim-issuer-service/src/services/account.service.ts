export interface Account {
    id: string;
    pan: string;
    balance: number;
    currency: string;
    dailyLimit: number;
    monthlyLimit: number;
    dailySpent: number;
    monthlySpent: number;
    status: 'ACTIVE' | 'BLOCKED' | 'FROZEN';
    cardholderName: string;
    issuerId: string;
}

// Pre-populated test accounts
const accounts: Map<string, Account> = new Map([
    ['4111111111111111', {
        id: 'ACC001',
        pan: '4111111111111111',
        balance: 5000.00,
        currency: 'EUR',
        dailyLimit: 1000,
        monthlyLimit: 5000,
        dailySpent: 0,
        monthlySpent: 0,
        status: 'ACTIVE',
        cardholderName: 'TEST VISA USER',
        issuerId: 'ISS001'
    }],
    ['5500000000000004', {
        id: 'ACC002',
        pan: '5500000000000004',
        balance: 2500.00,
        currency: 'EUR',
        dailyLimit: 500,
        monthlyLimit: 3000,
        dailySpent: 0,
        monthlySpent: 0,
        status: 'ACTIVE',
        cardholderName: 'TEST MASTERCARD USER',
        issuerId: 'ISS001'
    }],
    ['4000000000000002', {
        id: 'ACC003',
        pan: '4000000000000002',
        balance: 1000.00,
        currency: 'EUR',
        dailyLimit: 500,
        monthlyLimit: 2000,
        dailySpent: 0,
        monthlySpent: 0,
        status: 'BLOCKED',
        cardholderName: 'BLOCKED CARD USER',
        issuerId: 'ISS001'
    }],
    ['4000000000000051', {
        id: 'ACC004',
        pan: '4000000000000051',
        balance: 10.00, // Low balance for insufficient funds testing
        currency: 'EUR',
        dailyLimit: 500,
        monthlyLimit: 2000,
        dailySpent: 0,
        monthlySpent: 0,
        status: 'ACTIVE',
        cardholderName: 'INSUFFICIENT FUNDS',
        issuerId: 'ISS001'
    }]
]);

export const getAccountByPan = (pan: string): Account | null => {
    return accounts.get(pan) || null;
};

export const createAccount = (data: Partial<Account> & { pan: string }): Account => {
    const account: Account = {
        id: data.id || `ACC${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        pan: data.pan,
        balance: data.balance ?? 1000.00,
        currency: data.currency || 'EUR',
        dailyLimit: data.dailyLimit || 1000,
        monthlyLimit: data.monthlyLimit || 5000,
        dailySpent: 0,
        monthlySpent: 0,
        status: 'ACTIVE',
        cardholderName: data.cardholderName || 'NEW USER',
        issuerId: data.issuerId || 'ISS001'
    };
    accounts.set(account.pan, account);
    return account;
};

export const debitAccount = (pan: string, amount: number): { success: boolean; newBalance?: number; error?: string } => {
    const account = accounts.get(pan);
    if (!account) {
        return { success: false, error: 'Account not found' };
    }

    if (account.status !== 'ACTIVE') {
        return { success: false, error: `Account is ${account.status.toLowerCase()}` };
    }

    if (account.balance < amount) {
        return { success: false, error: 'Insufficient funds' };
    }

    if (account.dailySpent + amount > account.dailyLimit) {
        return { success: false, error: 'Daily limit exceeded' };
    }

    account.balance -= amount;
    account.dailySpent += amount;
    account.monthlySpent += amount;
    accounts.set(pan, account);

    return { success: true, newBalance: account.balance };
};

export const creditAccount = (pan: string, amount: number): { success: boolean; newBalance?: number; error?: string } => {
    const account = accounts.get(pan);
    if (!account) {
        return { success: false, error: 'Account not found' };
    }

    account.balance += amount;
    // Reduce spent tracking for refunds
    account.dailySpent = Math.max(0, account.dailySpent - amount);
    account.monthlySpent = Math.max(0, account.monthlySpent - amount);
    accounts.set(pan, account);

    return { success: true, newBalance: account.balance };
};

export const getAllAccounts = (): Account[] => {
    return Array.from(accounts.values()).map(a => ({
        ...a,
        pan: a.pan.substring(0, 4) + '****' + a.pan.substring(a.pan.length - 4)
    }));
};

export const updateAccountBalance = (pan: string, newBalance: number): Account | null => {
    const account = accounts.get(pan);
    if (!account) return null;
    account.balance = newBalance;
    accounts.set(pan, account);
    return account;
};
