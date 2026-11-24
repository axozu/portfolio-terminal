import { describe, expect, it } from 'vitest';
import { createTxFactory } from '@/test/fixtures/transactions';
import { transactionsToCsv } from './csv';
import {
  DEFAULT_QUERY,
  hasFilters,
  parseTransactionsQuery,
  serializeTransactionsQuery,
  updateQuery,
} from './queryParams';

describe('transactions query params', () => {
  it('round-trips through the URL and omits defaults', () => {
    const query = {
      ...DEFAULT_QUERY,
      type: 'buy' as const,
      ticker: 'AAPL',
      page: 3,
      sort: 'total:asc' as const,
    };
    const params = serializeTransactionsQuery(query);
    expect(params.toString()).toBe('type=buy&ticker=AAPL&sort=total%3Aasc&page=3');
    expect(parseTransactionsQuery(params)).toEqual(query);
    expect(serializeTransactionsQuery(DEFAULT_QUERY).toString()).toBe('');
  });

  it('drops invalid values from a hand-edited link', () => {
    expect(
      parseTransactionsQuery(new URLSearchParams('type=short&page=-1&sort=x&from=2025-01-01')),
    ).toEqual({
      ...DEFAULT_QUERY,
      from: '2025-01-01',
    });
  });

  it('resets to the first page when filters change, but not when paging', () => {
    const query = { ...DEFAULT_QUERY, page: 4 };
    expect(updateQuery(query, { type: 'sell' }).page).toBe(1);
    expect(updateQuery(query, { page: 5 }).page).toBe(5);
  });

  it('detects active filters', () => {
    expect(hasFilters(DEFAULT_QUERY)).toBe(false);
    expect(hasFilters({ ...DEFAULT_QUERY, q: 'x' })).toBe(true);
  });
});

describe('transactionsToCsv', () => {
  it('writes machine-readable rows with escaping', () => {
    const tx = createTxFactory();
    const csv = transactionsToCsv(
      [
        { ...tx.buy('2026-01-05', 'AAPL', 2, 150.5, 1), note: 'Rebalance, "core"' },
        tx.deposit('2026-01-02', 1000),
        { ...tx.withdrawal('2026-01-03', 5), note: '=HYPERLINK("x")' },
      ],
      (ticker) => (ticker === 'AAPL' ? 'Apple Inc.' : undefined),
    );
    expect(csv.split('\r\n')).toEqual([
      'date,type,ticker,name,quantity,price,fee,amount,cash_effect,note',
      '2026-01-05,buy,AAPL,Apple Inc.,2,150.5,1,,-302,"Rebalance, ""core"""',
      '2026-01-02,deposit,,,,,0,1000,1000,',
      // Заметка-формула экранирована апострофом, число −5 — нет.
      `2026-01-03,withdrawal,,,,,0,5,-5,"'=HYPERLINK(""x"")"`,
    ]);
  });
});
