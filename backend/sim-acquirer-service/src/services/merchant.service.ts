import { v4 as uuidv4 } from 'uuid';

export interface Merchant {
    id: string;
    name: string;
    mcc: string; // Merchant Category Code
    address: string;
    city: string;
    country: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';
    acquirerId: string;
    createdAt: Date;
}

// Pre-populated merchants
const merchants: Map<string, Merchant> = new Map([
    ['MERCHANT001', {
        id: 'MERCHANT001',
        name: 'Boutique Test Paris',
        mcc: '5411', // Grocery stores
        address: '123 Rue de Commerce',
        city: 'Paris',
        country: 'FR',
        status: 'ACTIVE',
        acquirerId: 'ACQ001',
        createdAt: new Date()
    }],
    ['MERCHANT002', {
        id: 'MERCHANT002',
        name: 'Restaurant Demo',
        mcc: '5812', // Restaurants
        address: '456 Avenue Gastronomie',
        city: 'Lyon',
        country: 'FR',
        status: 'ACTIVE',
        acquirerId: 'ACQ001',
        createdAt: new Date()
    }],
    ['MERCHANT003', {
        id: 'MERCHANT003',
        name: 'Hotel Luxe Test',
        mcc: '7011', // Hotels
        address: '789 Boulevard Palace',
        city: 'Nice',
        country: 'FR',
        status: 'ACTIVE',
        acquirerId: 'ACQ001',
        createdAt: new Date()
    }]
]);

export const getMerchant = (id: string): Merchant | null => {
    return merchants.get(id) || null;
};

export const getAllMerchants = (): Merchant[] => {
    return Array.from(merchants.values());
};

export const createMerchant = (data: Omit<Merchant, 'id' | 'createdAt' | 'acquirerId'>): Merchant => {
    const merchant: Merchant = {
        ...data,
        id: `MERCH${uuidv4().split('-')[0].toUpperCase()}`,
        acquirerId: 'ACQ001',
        createdAt: new Date()
    };
    merchants.set(merchant.id, merchant);
    return merchant;
};

export const updateMerchantStatus = (id: string, status: Merchant['status']): Merchant | null => {
    const merchant = merchants.get(id);
    if (!merchant) return null;
    merchant.status = status;
    merchants.set(id, merchant);
    return merchant;
};

export const validateMerchant = (id: string): { valid: boolean; error?: string; merchant?: Merchant } => {
    const merchant = merchants.get(id);
    if (!merchant) {
        return { valid: false, error: 'Merchant not found' };
    }
    if (merchant.status !== 'ACTIVE') {
        return { valid: false, error: `Merchant is ${merchant.status.toLowerCase()}` };
    }
    return { valid: true, merchant };
};
