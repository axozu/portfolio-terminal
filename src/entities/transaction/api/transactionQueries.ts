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

export function useCreateTransaction() {
  const invalidate = useInvalidateLedger();
  return useMutation({
    mutationFn: (input: TransactionInput) => http.post<Transaction>('/transactions', input),
    onSettled: invalidate,
  });
}

export function useUpdateTransaction() {
  const invalidate = useInvalidateLedger();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TransactionInput }) =>
      http.put<Transaction>(`/transactions/${encodeURIComponent(id)}`, input),
    onSettled: invalidate,
  });
}

export function useDeleteTransaction() {
  const invalidate = useInvalidateLedger();
  return useMutation({
    mutationFn: (id: string) => http.delete(`/transactions/${encodeURIComponent(id)}`),
    onSettled: invalidate,
  });
}
