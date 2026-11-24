import type { HistoryRange } from '@/shared/lib/finance';
import type { TransactionsQuery } from './contracts';

/**
 * Все ключи TanStack Query в одном месте. Иерархия позволяет инвалидировать группу
 * целиком: `queryKeys.portfolio.all` накрывает сводку, историю и позиции.
 */
export const queryKeys = {
  assets: {
    all: ['assets'] as const,
    list: () => [...queryKeys.assets.all, 'list'] as const,
    candles: (ticker: string, range: HistoryRange) =>
      [...queryKeys.assets.all, 'candles', ticker, range] as const,
  },
  portfolio: {
    all: ['portfolio'] as const,
    summary: () => [...queryKeys.portfolio.all, 'summary'] as const,
    history: (range: HistoryRange) => [...queryKeys.portfolio.all, 'history', range] as const,
    positions: () => [...queryKeys.portfolio.all, 'positions'] as const,
  },
  transactions: {
    all: ['transactions'] as const,
    list: (query: TransactionsQuery) => [...queryKeys.transactions.all, 'list', query] as const,
  },
  analytics: {
    all: ['analytics'] as const,
  },
};

/** Данные, производные от леджера: инвалидируются после любого изменения сделок. */
export const ledgerDependentKeys = [
  queryKeys.portfolio.all,
  queryKeys.transactions.all,
  queryKeys.analytics.all,
] as const;
