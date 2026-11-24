import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { queryKeys, type TransactionsPage } from '@/shared/api';
import type { Transaction } from '@/shared/model';

export type ListsSnapshot = [QueryKey, TransactionsPage | undefined][];

/** Останавливает загрузки списков и запоминает их, чтобы откатить при ошибке. */
export async function snapshotTransactionLists(client: QueryClient): Promise<ListsSnapshot> {
  await client.cancelQueries({ queryKey: queryKeys.transactions.all });
  return client.getQueriesData<TransactionsPage>({ queryKey: queryKeys.transactions.all });
}

export function restoreTransactionLists(client: QueryClient, snapshot: ListsSnapshot): void {
  for (const [key, data] of snapshot) client.setQueryData(key, data);
}

function updateLists(client: QueryClient, update: (page: TransactionsPage) => TransactionsPage) {
  client.setQueriesData<TransactionsPage>({ queryKey: queryKeys.transactions.all }, (page) =>
    page ? update(page) : page,
  );
}

/**
 * Оптимистичные правки закэшированных страниц списка. Они приблизительны (новая сделка
 * просто встаёт первой на первых страницах) — точный порядок и фильтры вернёт перезапрос
 * после ответа сервера.
 */
export const optimisticLists = {
  add(client: QueryClient, tx: Transaction) {
    updateLists(client, (page) =>
      page.page === 1
        ? { ...page, items: [tx, ...page.items].slice(0, page.pageSize), total: page.total + 1 }
        : page,
    );
  },
  replace(client: QueryClient, tx: Transaction) {
    updateLists(client, (page) => ({
      ...page,
      items: page.items.map((item) => (item.id === tx.id ? tx : item)),
    }));
  },
  remove(client: QueryClient, id: string) {
    updateLists(client, (page) =>
      page.items.some((item) => item.id === id)
        ? { ...page, items: page.items.filter((item) => item.id !== id), total: page.total - 1 }
        : page,
    );
  },
};

export const OPTIMISTIC_ID_PREFIX = 'optimistic-';
