import { beforeEach, describe, expect, it } from 'vitest';
import { createTxFactory, type TxFactory } from '@/test/fixtures/transactions';
import { averagePrice, openHoldings, replayLedger, sortLedger, validateLedger } from './ledger';

let tx: TxFactory;
beforeEach(() => {
  tx = createTxFactory();
});

describe('cash', () => {
  it('follows the formula: deposits − withdrawals − buys + sells + dividends', () => {
    const { state } = replayLedger([
      tx.deposit('2024-01-02', 10_000),
      tx.buy('2024-01-03', 'AAPL', 10, 150, 1), // −1501
      tx.sell('2024-02-01', 'AAPL', 4, 170, 1), // +679
      tx.dividend('2024-03-01', 'AAPL', 2.4), // +2.4
      tx.withdrawal('2024-04-01', 1_000), // −1000
    ]);
    expect(state.cash).toBeCloseTo(10_000 - 1_501 + 679 + 2.4 - 1_000, 9);
    expect(state.totals).toMatchObject({
      deposits: 10_000,
      withdrawals: 1_000,
      dividends: 2.4,
      fees: 2,
    });
  });
});

describe('average cost', () => {
  it('includes fees in the cost of a purchase', () => {
    const { state } = replayLedger([
      tx.deposit('2024-01-02', 10_000),
      tx.buy('2024-01-03', 'MSFT', 10, 100, 5), // стоимость 1005
      tx.buy('2024-01-04', 'MSFT', 10, 120, 5), // стоимость 1205
    ]);
    const msft = state.holdings.get('MSFT');
    expect(msft?.quantity).toBe(20);
    expect(msft?.costBasis).toBeCloseTo(2_210, 9);
    expect(msft && averagePrice(msft)).toBeCloseTo(110.5, 9);
  });

  it('keeps the average price on a sale and computes realized P/L', () => {
    const { state } = replayLedger([
      tx.deposit('2024-01-02', 10_000),
      tx.buy('2024-01-03', 'MSFT', 10, 100, 5),
      tx.buy('2024-01-04', 'MSFT', 10, 120, 5), // avg = 110.5
      tx.sell('2024-02-01', 'MSFT', 5, 130, 2), // (130 − 110.5) × 5 − 2 = 95.5
    ]);
    const msft = state.holdings.get('MSFT');
    expect(msft?.quantity).toBe(15);
    expect(msft && averagePrice(msft)).toBeCloseTo(110.5, 9);
    expect(msft?.realizedPnl).toBeCloseTo(95.5, 9);
    expect(state.totals.realizedPnl).toBeCloseTo(95.5, 9);
  });

  it('records a realized loss', () => {
    const { state } = replayLedger([
      tx.deposit('2024-01-02', 1_000),
      tx.buy('2024-01-03', 'NVDA', 2, 400),
      tx.sell('2024-01-10', 'NVDA', 2, 350, 1), // (350 − 400) × 2 − 1 = −101
    ]);
    expect(state.totals.realizedPnl).toBeCloseTo(-101, 9);
  });

  it('resets cost basis when a position is fully closed, then starts fresh', () => {
    const { state } = replayLedger([
      tx.deposit('2024-01-02', 10_000),
      tx.buy('2024-01-03', 'BTC', 0.1, 40_000),
      tx.sell('2024-01-10', 'BTC', 0.1, 45_000),
      tx.buy('2024-02-01', 'BTC', 0.05, 50_000),
    ]);
    const btc = state.holdings.get('BTC');
    expect(btc?.quantity).toBeCloseTo(0.05, 12);
    expect(btc && averagePrice(btc)).toBeCloseTo(50_000, 6);
    expect(btc?.realizedPnl).toBeCloseTo(500, 9);
  });

  it('handles fractional crypto quantities without leaving dust', () => {
    const { state } = replayLedger([
      tx.deposit('2024-01-02', 10_000),
      tx.buy('2024-01-03', 'ETH', 0.1, 3_000),
      tx.buy('2024-01-04', 'ETH', 0.2, 3_000),
      tx.sell('2024-01-05', 'ETH', 0.3, 3_100), // 0.1 + 0.2 ≠ 0.3 во float
    ]);
    expect(state.holdings.get('ETH')?.quantity).toBe(0);
    expect(openHoldings(state)).toHaveLength(0);
  });
});

describe('ordering', () => {
  it('sorts by date and keeps the original order within a day', () => {
    const a = tx.deposit('2024-01-05', 1);
    const b = tx.deposit('2024-01-02', 2);
    const c = tx.deposit('2024-01-05', 3);
    expect(sortLedger([a, b, c]).map((t) => t.id)).toEqual([b.id, a.id, c.id]);
  });

  it('replays in chronological order regardless of input order', () => {
    const sell = tx.sell('2024-02-01', 'AAPL', 1, 200);
    const buy = tx.buy('2024-01-03', 'AAPL', 1, 100);
    const deposit = tx.deposit('2024-01-02', 100);
    expect(validateLedger([sell, buy, deposit])).toBeNull();
  });

  it('can stop at a date (state at end of that day)', () => {
    const txs = [tx.deposit('2024-01-02', 100), tx.deposit('2024-01-03', 50)];
    expect(replayLedger(txs, { until: '2024-01-02' }).state.cash).toBe(100);
    expect(replayLedger(txs, { until: '2024-01-03' }).state.cash).toBe(150);
  });
});

describe('validation', () => {
  it('rejects a buy without enough cash', () => {
    const buy = tx.buy('2024-01-03', 'AAPL', 10, 150, 1);
    expect(validateLedger([tx.deposit('2024-01-02', 1_000), buy])).toEqual({
      transactionId: buy.id,
      date: '2024-01-03',
      reason: 'insufficient_cash',
      required: 1_501,
      available: 1_000,
    });
  });

  it('allows spending exactly all cash (within tolerance)', () => {
    expect(
      validateLedger([tx.deposit('2024-01-02', 0.3), tx.buy('2024-01-03', 'X', 3, 0.1)]),
    ).toBeNull();
  });

  it('rejects a withdrawal without enough cash', () => {
    const w = tx.withdrawal('2024-01-03', 500);
    expect(validateLedger([tx.deposit('2024-01-02', 100), w])).toMatchObject({
      transactionId: w.id,
      reason: 'insufficient_cash',
    });
  });

  it('rejects selling more than held at that date', () => {
    const sell = tx.sell('2024-01-04', 'AAPL', 11, 150);
    expect(
      validateLedger([
        tx.deposit('2024-01-02', 5_000),
        tx.buy('2024-01-03', 'AAPL', 10, 150),
        sell,
      ]),
    ).toMatchObject({
      transactionId: sell.id,
      reason: 'insufficient_quantity',
      required: 11,
      available: 10,
    });
  });

  it('rejects a sale dated before the purchase', () => {
    const sell = tx.sell('2024-01-02', 'AAPL', 1, 150);
    expect(
      validateLedger([tx.deposit('2024-01-01', 5_000), tx.buy('2024-01-03', 'AAPL', 1, 150), sell]),
    ).toMatchObject({ transactionId: sell.id, reason: 'insufficient_quantity' });
  });

  it('rejects a dividend without a position', () => {
    const div = tx.dividend('2024-01-03', 'KO', 10);
    expect(validateLedger([tx.deposit('2024-01-02', 100), div])).toEqual({
      transactionId: div.id,
      date: '2024-01-03',
      reason: 'no_position',
    });
  });

  it('detects that deleting a buy breaks a later sale', () => {
    const deposit = tx.deposit('2024-01-02', 5_000);
    const buy = tx.buy('2024-01-03', 'AAPL', 10, 150);
    const sell = tx.sell('2024-02-01', 'AAPL', 5, 160);
    expect(validateLedger([deposit, buy, sell])).toBeNull();
    expect(validateLedger([deposit, sell])).toMatchObject({ transactionId: sell.id });
  });

  it('skips an invalid transaction and keeps replaying', () => {
    const { state, violations } = replayLedger([
      tx.deposit('2024-01-02', 100),
      tx.buy('2024-01-03', 'AAPL', 10, 150),
      tx.deposit('2024-01-04', 50),
    ]);
    expect(violations).toHaveLength(1);
    expect(state.cash).toBe(150);
    expect(state.holdings.get('AAPL')).toBeUndefined();
  });
});
