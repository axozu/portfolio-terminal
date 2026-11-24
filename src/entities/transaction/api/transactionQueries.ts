import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  http,
  ledgerDependentKeys,
  queryKeys,
  type TransactionsPage,
  type TransactionsQuery,
} from '@/shared/api';
import type { Transaction, TransactionInput } from '@/shared/model';
import {
  OPTIMISTIC_ID_PREFIX,
  optimisticLists,
  restoreTransactionLists,
  snapshotTransactionLists,
} from './optimistic';

export const transactionQueries = {
  list: (query: TransactionsQuery) =>
    queryOptions({
      queryKey: queryKeys.transactions.list(query),
      queryFn: ({ signal }) => http.get<TransactionsPage>('/transactions', { ...query }, signal),
      // Пагинация и фильтры не «мигают» пустой таблицей.
      placeholderData: keepPreviousData,
    }),
};

export function useTransactions(query: TransactionsQuery) {
  return useQuery(transactionQueries.list(query));
}

/** После любой мутации сделок пересчитывается весь дашборд: портфель, сделки, аналитика. */
function useInvalidateLedger() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(ledgerDependentKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

/**
 * Мутации сделок с оптимистичным обновлением списков: строка меняется сразу,
 * при ошибке снимок кэша восстанавливается, после ответа — перезапрос зависимых данных.
 */
export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateLedger();
  return useMutation({
    mutationFn: (input: TransactionInput) => http.post<Transaction>('/transactions', input),
    onMutate: async (input) => {
      const snapshot = await snapshotTransactionLists(queryClient);
      optimisticLists.add(queryClient, {
        ...input,
        id: `${OPTIMISTIC_ID_PREFIX}${String(Date.now())}`,
      });
      return { snapshot };
    },
    onError: (_error, _input, context) => {
      if (context) restoreTransactionLists(queryClient, context.snapshot);
    },
    onSettled: invalidate,
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateLedger();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TransactionInput }) =>
      http.put<Transaction>(`/transactions/${encodeURIComponent(id)}`, input),
    onMutate: async ({ id, input }) => {
      const snapshot = await snapshotTransactionLists(queryClient);
      optimisticLists.replace(queryClient, { ...input, id });
      return { snapshot };
    },
    onError: (_error, _vars, context) => {
      if (context) restoreTransactionLists(queryClient, context.snapshot);
    },
    onSettled: invalidate,
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateLedger();
  return useMutation({
    mutationFn: (id: string) => http.delete(`/transactions/${encodeURIComponent(id)}`),
    onMutate: async (id) => {
      const snapshot = await snapshotTransactionLists(queryClient);
      optimisticLists.remove(queryClient, id);
      return { snapshot };
    },
    onError: (_error, _id, context) => {
      if (context) restoreTransactionLists(queryClient, context.snapshot);
    },
    onSettled: invalidate,
  });
}
