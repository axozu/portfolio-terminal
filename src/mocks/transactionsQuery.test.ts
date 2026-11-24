import { describe, expect, it } from 'vitest';
import { transactionsQuerySchema } from '@/shared/api';
import type { Asset } from '@/shared/model';
import { createTxFactory } from '@/test/fixtures/transactions';
import { queryTransactions } from './transactionsQuery';

const tx = createTxFactory();
const ledger = [
  tx.deposit('2024-01-02', 10_000),
  tx.buy('2024-01-03', 'AAPL', 10, 150, 1),
  { ...tx.buy('2024-01-03', 'MSFT', 5, 300, 1), note: 'Rebalance' },
  tx.sell('2024-02-01', 'AAPL', 4, 170, 1),
  tx.dividend('2024-03-01', 'MSFT', 12),
];
const assets = new Map<string, Asset>([
  [
    'AAPL',
    {
      ticker: 'AAPL',
      name: 'Apple Inc.',
      class: 'stock',
      sector: 'technology',
      quantityPrecision: 4,
    },
  ],
  [
    'MSFT',
    {
      ticker: 'MSFT',
      name: 'Microsoft Corp.',
      class: 'stock',
      sector: 'technology',
      quantityPrecision: 4,
    },
  ],
]);

const run = (params: Record<string, string>) =>
  queryTransactions(ledger, assets, transactionsQuerySchema.parse(params));
const ids = (params: Record<string, string>) => run(params).items.map((t) => t.id);

describe('transactionsQuerySchema', () => {
  it('applies defaults and treats empty strings as missing', () => {
    expect(transactionsQuerySchema.parse({ type: '', q: '' })).toEqual({
      sort: 'date:desc',
      page: 1,
      pageSize: 20,
    });
  });

  it('rejects unknown values', () => {
    expect(transactionsQuerySchema.safeParse({ type: 'short' }).success).toBe(false);
    expect(transactionsQuerySchema.safeParse({ sort: 'date:sideways' }).success).toBe(false);
    expect(transactionsQuerySchema.safeParse({ page: '0' }).success).toBe(false);
  });
});

describe('queryTransactions', () => {
  it('sorts by date descending with ledger order reversed on ties', () => {
    expect(ids({})).toEqual(['t5', 't4', 't3', 't2', 't1']);
    expect(ids({ sort: 'date:asc' })).toEqual(['t1', 't2', 't3', 't4', 't5']);
  });

  it('sorts by signed cash total, ledger order on ties', () => {
    // t2 и t3 стоят одинаково: 10 × 150 + 1 = 5 × 300 + 1 = 1501.
    expect(ids({ sort: 'total:asc' })).toEqual(['t2', 't3', 't5', 't4', 't1']);
  });

  it('filters by type, ticker (case-insensitive) and date range', () => {
    expect(ids({ type: 'buy' })).toEqual(['t3', 't2']);
    expect(ids({ ticker: 'aapl' })).toEqual(['t4', 't2']);
    expect(ids({ from: '2024-01-03', to: '2024-02-01' })).toEqual(['t4', 't3', 't2']);
  });

  it('searches ticker, asset name and note', () => {
    expect(ids({ q: 'apple' })).toEqual(['t4', 't2']);
    expect(ids({ q: 'rebal' })).toEqual(['t3']);
  });

  it('paginates and reports the filtered total', () => {
    expect(run({ pageSize: '2', page: '2' })).toMatchObject({ total: 5, page: 2, pageSize: 2 });
    expect(ids({ pageSize: '2', page: '2' })).toEqual(['t3', 't2']);
    expect(ids({ pageSize: '2', page: '9' })).toEqual([]);
  });
});
