import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GeneratedCard } from './card-engine/generator';

interface UserState {
    cards: GeneratedCard[];
    addCard: (card: GeneratedCard) => void;
    removeCard: (id: string) => void;
    toggleCardStatus: (id: string) => void;
    updateBalance: (id: string, amount: number) => void;
}

export const useUserStore = create<UserState>()(
    persist(
        (set) => ({
            cards: [],
            addCard: (card) => set((state) => ({ cards: [...state.cards, card] })),
            removeCard: (id) => set((state) => ({ cards: state.cards.filter((c) => c.id !== id) })),
            toggleCardStatus: (id) =>
                set((state) => ({
                    cards: state.cards.map((c) =>
                        c.id === id ? { ...c, status: c.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE' } : c
                    ),
                })),
            updateBalance: (id, amount) =>
                set((state) => ({
                    cards: state.cards.map((c) =>
                        c.id === id ? { ...c, balance: c.balance + amount } : c
                    ),
                })),
        }),
        {
            name: 'user-cards-storage',
        }
    )
);
