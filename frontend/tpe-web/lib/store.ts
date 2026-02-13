import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
    TransactionState,
    TransactionType,
    TransactionResponse,
    TransactionRecord,
    CardData,
    DebugData,
} from '@/types/transaction';

export interface SelectedCard {
    id: string;
    maskedPan: string;
    cardType: string;
    network: string;
    balance: number;
    status: string;
    threedsEnrolled: boolean;
}

export interface SelectedMerchant {
    id: string;
    displayName: string;
    merchantName: string;
    mcc: string;
    terminalId: string | null;
    locationName: string | null;
    city: string | null;
}

interface TerminalStore {
    // Terminal State
    state: TransactionState;
    amount: number;
    selectedType: TransactionType;
    cardData: CardData | null;

    // Payment Selection
    selectedCard: SelectedCard | null;
    selectedMerchant: SelectedMerchant | null;
    lastTransactionId: string | null;

    // Transaction Results
    currentTransaction: TransactionResponse | null;
    transactionHistory: TransactionRecord[];

    // Pedagogical Mode
    debugMode: boolean;
    debugData: DebugData | null;
    showTechnicalDetails: boolean;

    // Actions
    setState: (state: TransactionState) => void;
    setAmount: (amount: number) => void;
    setTransactionType: (type: TransactionType) => void;
    setCardData: (data: CardData | null) => void;
    setSelectedCard: (card: SelectedCard | null) => void;
    setSelectedMerchant: (merchant: SelectedMerchant | null) => void;
    setLastTransactionId: (id: string | null) => void;
    setCurrentTransaction: (response: TransactionResponse | null) => void;
    addToHistory: (record: TransactionRecord) => void;
    toggleDebugMode: () => void;
    setDebugData: (data: DebugData | null) => void;
    toggleTechnicalDetails: () => void;
    reset: () => void;
}

export const useTerminalStore = create<TerminalStore>()(
    devtools(
        (set) => ({
            // Initial State
            state: 'idle',
            amount: 0,
            selectedType: 'PURCHASE',
            cardData: null,
            selectedCard: null,
            selectedMerchant: null,
            lastTransactionId: null,
            currentTransaction: null,
            transactionHistory: [],
            debugMode: false,
            debugData: null,
            showTechnicalDetails: false,

            // Actions
            setState: (state) => set({ state }),
            setAmount: (amount) => set({ amount }),
            setTransactionType: (type) => set({ selectedType: type }),
            setCardData: (data) => set({ cardData: data }),
            setSelectedCard: (card) => set({ selectedCard: card }),
            setSelectedMerchant: (merchant) => set({ selectedMerchant: merchant }),
            setLastTransactionId: (id) => set({ lastTransactionId: id }),
            setCurrentTransaction: (response) => set({ currentTransaction: response }),
            addToHistory: (record) =>
                set((state) => ({
                    transactionHistory: [record, ...state.transactionHistory].slice(0, 50),
                })),
            toggleDebugMode: () => set((state) => ({ debugMode: !state.debugMode })),
            setDebugData: (data) => set({ debugData: data }),
            toggleTechnicalDetails: () =>
                set((state) => ({ showTechnicalDetails: !state.showTechnicalDetails })),
            reset: () =>
                set({
                    state: 'idle',
                    amount: 0,
                    cardData: null,
                    selectedCard: null,
                    selectedMerchant: null,
                    currentTransaction: null,
                    debugData: null,
                }),
        }),
        { name: 'TerminalStore' }
    )
);
