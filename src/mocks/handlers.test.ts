import { describe, expect, it } from 'vitest';
import {
  ApiError,
  http,
  type AnalyticsResponse,
  type AssetListItem,
  type CandlesResponse,
  type HistoryResponse,
  type PositionItem,
  type SummaryResponse,
  type TransactionsPage,
} from '@/shared/api';
import type { Transaction, TransactionInput } from '@/shared/model';
import { setupTestApi, TEST_TODAY } from '@/test/mockApi';

/** Ошибка запроса как значение — чтобы проверять тело ответа. */
async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error('Expected the request to fail');
}

const buy = (
  over: Partial<Extract<TransactionInput, { type: 'buy' | 'sell' }>> = {},
): TransactionInput => ({
  type: 'buy',
  date: TEST_TODAY,
  ticker: 'AAPL',
  quantity: 1,
  price: 200,
  amount: null,
  fee: 1,
  ...over,
});

describe('GET /api/assets', () => {
  it('lists assets with today quotes and history start', async () => {
    setupTestApi();
    const assets = await http.get<AssetListItem[]>('/assets');
    expect(assets.length).toBeGreaterThanOrEqual(18);
    const aapl = assets.find((a) => a.ticker === 'AAPL');
    expect(aapl).toMatchObject({ name: 'Apple Inc.', class: 'stock', price: 228 });
    expect((aapl?.historyStart ?? TEST_TODAY) < TEST_TODAY).toBe(true);
  });
});

describe('GET /api/assets/:ticker/candles', () => {
  it('returns candles for a range ending today', async () => {
    setupTestApi();
    const res = await http.get<CandlesResponse>('/assets/btc/candles', { range: '1M' });
    expect(res.ticker).toBe('BTC');
    expect(res.candles.length).toBeGreaterThan(18);
    expect(res.candles.length).toBeLessThan(25);
    expect(res.candles.at(-1)?.date).toBe(TEST_TODAY);
  });

  it('answers 404 for an unknown ticker and 400 for a bad range', async () => {
    setupTestApi();
    expect((await failure(http.get('/assets/NOPE/candles'))).status).toBe(404);
    expect((await failure(http.get('/assets/AAPL/candles', { range: '5Y' }))).status).toBe(400);
  });
});

describe('portfolio endpoints', () => {
  it('summary agrees with positions', async () => {
    setupTestApi();
    const [summary, positions] = await Promise.all([
      http.get<SummaryResponse>('/portfolio/summary'),
      http.get<PositionItem[]>('/positions'),
    ]);
    const positionsValue = positions.reduce((s, p) => s + p.marketValue, 0);
    const unrealized = positions.reduce((s, p) => s + p.unrealizedPnl, 0);
    expect(summary.asOf).toBe(TEST_TODAY);
    expect(summary.positionsValue).toBeCloseTo(positionsValue, 6);
    expect(summary.totalValue).toBeCloseTo(positionsValue + summary.cash, 6);
    expect(summary.unrealizedPnl).toBeCloseTo(unrealized, 6);
    expect(summary.allocation.reduce((s, a) => s + a.weight, 0)).toBeCloseTo(1, 9);
  });

  it('positions are sorted by value and carry a 30-day sparkline', async () => {
    setupTestApi();
    const positions = await http.get<PositionItem[]>('/positions');
    const values = positions.map((p) => p.marketValue);
    expect(values).toEqual([...values].sort((a, b) => b - a));
    for (const p of positions) {
      expect(p.sparkline.length).toBeGreaterThan(18);
      expect(p.sparkline.at(-1)).toBe(p.currentPrice);
    }
  });

  it('history ends at the current value and starts the benchmark at the same value', async () => {
    setupTestApi();
    const [history, summary] = await Promise.all([
      http.get<HistoryResponse>('/portfolio/history', { range: '6M' }),
      http.get<SummaryResponse>('/portfolio/summary'),
    ]);
    const first = history.points[0];
    expect(history.range).toBe('6M');
    expect(first?.benchmark).toBeCloseTo(first?.value ?? 0, 6);
    expect(history.points.at(-1)?.value).toBeCloseTo(summary.totalValue, 6);
    expect((await failure(http.get('/portfolio/history', { range: 'nope' }))).status).toBe(400);
  });

  it('analytics returns metrics and series', async () => {
    setupTestApi();
    const analytics = await http.get<AnalyticsResponse>('/analytics');
    expect(analytics.maxDrawdown).toBeLessThan(-0.1);
    expect(analytics.volatility).toBeGreaterThan(0);
    expect(analytics.sharpe).not.toBeNull();
    expect(analytics.riskFreeRate).toBe(0.04);
    expect(analytics.monthlyReturns.length).toBeGreaterThan(30);
    expect(analytics.dividendsByMonth.some((d) => d.amount > 0)).toBe(true);
    expect(analytics.sectors.reduce((s, x) => s + x.weight, 0)).toBeCloseTo(1, 9);
  });
});

describe('GET /api/transactions', () => {
  it('paginates newest first by default', async () => {
    setupTestApi();
    const page = await http.get<TransactionsPage>('/transactions', { pageSize: 10 });
    expect(page.items).toHaveLength(10);
    expect(page.total).toBeGreaterThan(100);
    const dates = page.items.map((t) => t.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('filters by type, ticker and date range, and searches', async () => {
    setupTestApi();
    const dividends = await http.get<TransactionsPage>('/transactions', {
      type: 'dividend',
      pageSize: 100,
    });
    expect(dividends.items.every((t) => t.type === 'dividend')).toBe(true);

    const voo = await http.get<TransactionsPage>('/transactions', {
      ticker: 'voo',
      from: '2025-01-01',
      to: '2025-12-31',
    });
    expect(
      voo.items.every(
        (t) => t.ticker === 'VOO' && t.date >= '2025-01-01' && t.date <= '2025-12-31',
      ),
    ).toBe(true);

    const byName = await http.get<TransactionsPage>('/transactions', {
      q: 'vanguard',
      pageSize: 100,
    });
    expect(byName.total).toBeGreaterThan(0);
    expect(
      byName.items.every((t) => t.ticker === 'VOO' || t.ticker === 'VNQ' || t.ticker === 'BND'),
    ).toBe(true);
  });

  it('sorts by total and rejects bad parameters', async () => {
    setupTestApi();
    const page = await http.get<TransactionsPage>('/transactions', {
      sort: 'total:desc',
      pageSize: 1,
    });
    expect(page.items[0]?.type).toBe('deposit'); // начальное пополнение — самая крупная сумма
    expect((await failure(http.get('/transactions', { sort: 'nope:asc' }))).status).toBe(400);
    expect((await failure(http.get('/transactions', { pageSize: 1000 }))).status).toBe(400);
  });
});

describe('transaction mutations', () => {
  it('creates a buy that changes the portfolio', async () => {
    setupTestApi();
    const before = await http.get<SummaryResponse>('/portfolio/summary');
    const created = await http.post<Transaction>('/transactions', buy());
    expect(created).toMatchObject({ id: 'user-1', ticker: 'AAPL' });
    const after = await http.get<SummaryResponse>('/portfolio/summary');
    expect(after.cash).toBeCloseTo(before.cash - 201, 6);
  });

  it('answers 422 with field errors', async () => {
    setupTestApi();
    const error = await failure(
      http.post('/transactions', buy({ quantity: -1, date: '2099-01-01' })),
    );
    expect(error.status).toBe(422);
    expect(error.body).toMatchObject({
      code: 'validation_failed',
      fieldErrors: { quantity: { code: 'must_be_positive' } },
    });
    const noCash = await failure(http.post('/transactions', buy({ quantity: 10_000 })));
    expect(noCash.body?.fieldErrors?.quantity?.code).toBe('insufficient_cash');
  });

  it('updates and deletes a user transaction', async () => {
    const db = setupTestApi();
    const created = await http.post<Transaction>('/transactions', buy());
    const updated = await http.put<Transaction>(
      `/transactions/${created.id}`,
      buy({ quantity: 2 }),
    );
    expect(updated).toMatchObject({ id: created.id, quantity: 2 });
    await http.delete(`/transactions/${created.id}`);
    expect(db.findTransaction(created.id)).toBeUndefined();
    expect(db.hasUserChanges).toBe(false);
  });

  it('refuses to delete a transaction that later ones depend on', async () => {
    const db = setupTestApi();
    const initialDeposit = db.transactions[0];
    const error = await failure(http.delete(`/transactions/${initialDeposit?.id ?? ''}`));
    expect(error.status).toBe(422);
    expect(error.body).toMatchObject({
      code: 'ledger_conflict',
      conflict: { reason: 'insufficient_cash' },
    });
  });

  it('answers 404 for unknown ids', async () => {
    setupTestApi();
    expect((await failure(http.put('/transactions/nope', buy()))).status).toBe(404);
    expect((await failure(http.delete('/transactions/nope'))).status).toBe(404);
  });

  it('resets user changes', async () => {
    const db = setupTestApi();
    await http.post('/transactions', buy());
    await http.postVoid('/demo/reset');
    expect(db.hasUserChanges).toBe(false);
  });
});

describe('chaos mode', () => {
  it('fails GET requests with 500 when enabled and the dice say so', async () => {
    setupTestApi({ chaos: true, random: () => 0.1 });
    const error = await failure(http.get('/assets'));
    expect(error.status).toBe(500);
    expect(error.code).toBe('internal_error');
  });

  it('never fails mutations', async () => {
    setupTestApi({ chaos: true, random: () => 0.1 });
    await expect(http.post('/transactions', buy())).resolves.toBeDefined();
  });

  it('is off by default', async () => {
    setupTestApi({ random: () => 0 });
    await expect(http.get('/assets')).resolves.toBeDefined();
  });
});
