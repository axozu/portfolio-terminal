import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Transaction, TransactionType } from '@/shared/model';

/** Что подставить в форму сделки при открытии (например, «Купить» на странице актива). */
export interface TransactionFormPrefill {
  type?: TransactionType;
  ticker?: string;
}

export type TransactionFormState =
  | { open: false }
  | { open: true; mode: 'create'; prefill: TransactionFormPrefill }
  | { open: true; mode: 'edit'; transaction: Transaction };

interface UiState {
  /** Пользователь свернул сайдбар (действует на широких экранах; на средних он свёрнут всегда). */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  transactionForm: TransactionFormState;
  openCreateForm: (prefill?: TransactionFormPrefill) => void;
  openEditForm: (transaction: Transaction) => void;
  closeTransactionForm: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      },
      transactionForm: { open: false },
      openCreateForm: (prefill = {}) => {
        set({ transactionForm: { open: true, mode: 'create', prefill } });
      },
      openEditForm: (transaction) => {
        set({ transactionForm: { open: true, mode: 'edit', transaction } });
      },
      closeTransactionForm: () => {
        set({ transactionForm: { open: false } });
      },
    }),
    {
      name: 'portfolio-terminal:ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    },
  ),
);
