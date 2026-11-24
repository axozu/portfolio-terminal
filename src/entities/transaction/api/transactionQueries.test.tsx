import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { usePortfolioSummary } from '@/entities/portfolio';
import { createQueryClient } from '@/shared/api';
import { setupTestApi, TEST_TODAY } from '@/test/mockApi';
import { useCreateTransaction, useTransactions } from './transactionQueries';

function createWrapper() {
  const client = createQueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('transaction query hooks', () => {
  it('loads a page of transactions', async () => {
    setupTestApi();
    const { result } = renderHook(
      () => useTransactions({ sort: 'date:desc', page: 1, pageSize: 5 }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.items).toHaveLength(5);
  });

  it('refreshes the portfolio after creating a transaction', async () => {
    setupTestApi();
    const { result } = renderHook(
      () => ({ summary: usePortfolioSummary(), create: useCreateTransaction() }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => {
      expect(result.current.summary.isSuccess).toBe(true);
    });
    const cashBefore = result.current.summary.data?.cash ?? 0;

    await act(() =>
      result.current.create.mutateAsync({
        type: 'deposit',
        date: TEST_TODAY,
        ticker: null,
        quantity: null,
        price: null,
        amount: 1_000,
        fee: 0,
      }),
    );

    await waitFor(() => {
      expect(result.current.summary.data?.cash).toBeCloseTo(cashBefore + 1_000, 6);
    });
  });
});
