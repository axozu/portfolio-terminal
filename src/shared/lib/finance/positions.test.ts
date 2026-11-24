import { describe, expect, it } from 'vitest';
import type { Quote } from '@/shared/model';
import { createTxFactory } from '@/test/fixtures/transactions';
import { computePortfolio, quoteFromCandles } from './positions';

const tx = createTxFactory();

function quotes(...list: [ticker: string, price: number, previousClose: number][]) {
  return new Map<string, Quote>(
    list.map(([ticker, price, previousClose]) => [ticker, { ticker, price, previousClose }]),
  );
}

// Пополнение 10 000; AAPL: 10 × 100 + 5; MSFT: 5 × 200 + 5; продажа 2 AAPL по 120 − 1.
const ledger = [
  tx.deposit('2024-01-02', 10_000),
  tx.buy('2024-01-03', 'AAPL', 10, 100, 5), // avg 100.5
  tx.buy('2024-01-03', 'MSFT', 5, 200, 5), // avg 201
  tx.sell('2024-02-01', 'AAPL', 2, 120, 1), // realized (120 − 100.5) × 2 − 1 = 38
  tx.dividend('2024-03-01', 'MSFT', 10),
];
const cash = 10_000 - 1_005 - 1_005 + 239 + 10; // 8 239

describe('computePortfolio', () => {
  const { positions, summary } = computePortfolio(
    ledger,
    quotes(['AAPL', 110, 100], ['MSFT', 190, 200]),
  );
  const aapl = positions.find((p) => p.ticker === 'AAPL');
  const msft = positions.find((p) => p.ticker === 'MSFT');

  it('computes market value and unrealized P/L per position', () => {
    expect(aapl).toMatchObject({ quantity: 8, currentPrice: 110 });
    expect(aapl?.averagePrice).toBeCloseTo(100.5, 9);
    expect(aapl?.marketValue).toBeCloseTo(880, 9);
    expect(aapl?.unrealizedPnl).toBeCloseTo(880 - 8 * 100.5, 9); // 76
    expect(aapl?.unrealizedPnlPct).toBeCloseTo(76 / 804, 9);
    expect(msft?.unrealizedPnl).toBeCloseTo(950 - 1_005, 9); // −55
  });

  it('computes day change against the previous close', () => {
    expect(aapl?.dayChange).toBeCloseTo(80, 9);
    expect(aapl?.dayChangePct).toBeCloseTo(0.1, 9);
    expect(msft?.dayChange).toBeCloseTo(-50, 9);
    expect(msft?.dayChangePct).toBeCloseTo(-0.05, 9);
  });

  it('weights positions against positions + cash', () => {
    const total = 880 + 950 + cash;
    expect(aapl?.weight).toBeCloseTo(880 / total, 9);
    expect(msft?.weight).toBeCloseTo(950 / total, 9);
  });

  it('summarizes the portfolio consistently with the positions', () => {
    expect(summary.cash).toBeCloseTo(cash, 9);
    expect(summary.positionsValue).toBeCloseTo(1_830, 9);
    expect(summary.totalValue).toBeCloseTo(1_830 + cash, 9);
    expect(summary.unrealizedPnl).toBeCloseTo(76 - 55, 9);
    expect(summary.realizedPnl).toBeCloseTo(38, 9);
    expect(summary.dividends).toBe(10);
    expect(summary.fees).toBe(11);
    expect(summary.dayChange).toBeCloseTo(30, 9);
    expect(summary.dayChangePct).toBeCloseTo(30 / (1_830 + cash - 30), 9);
  });

  it('computes simple total return against net invested', () => {
    expect(summary.netInvested).toBe(10_000);
    expect(summary.totalReturn).toBeCloseTo(1_830 + cash - 10_000, 9);
    expect(summary.totalReturnPct).toBeCloseTo((1_830 + cash - 10_000) / 10_000, 9);
  });

  it('reconciles: total return = unrealized + realized P/L + dividends', () => {
    // Комиссии покупок уже сидят в costBasis (то есть в unrealized), комиссия продажи — в realized.
    expect(summary.totalReturn).toBeCloseTo(
      summary.unrealizedPnl + summary.realizedPnl + summary.dividends,
      9,
    );
  });

  it('weights plus cash share sum to one', () => {
    const weights = positions.reduce((acc, p) => acc + p.weight, 0);
    expect(weights + summary.cash / summary.totalValue).toBeCloseTo(1, 12);
  });
});

describe('edge cases', () => {
  it('omits closed positions but keeps their realized P/L', () => {
    const { positions, summary } = computePortfolio(
      [
        tx.deposit('2024-01-02', 1_000),
        tx.buy('2024-01-03', 'NVDA', 2, 400),
        tx.sell('2024-01-04', 'NVDA', 2, 450),
      ],
      quotes(['NVDA', 500, 490]),
    );
    expect(positions).toHaveLength(0);
    expect(summary.realizedPnl).toBeCloseTo(100, 9);
    expect(summary.totalValue).toBeCloseTo(1_100, 9);
  });

  it('returns null total return when nothing is invested', () => {
    const { summary } = computePortfolio([], new Map());
    expect(summary.totalValue).toBe(0);
    expect(summary.totalReturnPct).toBeNull();
    expect(summary.dayChangePct).toBe(0);
  });

  it('throws on a missing quote', () => {
    expect(() =>
      computePortfolio(
        [tx.deposit('2024-01-02', 1_000), tx.buy('2024-01-03', 'XYZ', 1, 10)],
        new Map(),
      ),
    ).toThrow(/XYZ/);
  });
});

describe('quoteFromCandles', () => {
  const candle = (date: string, close: number) => ({
    date,
    open: close,
    high: close,
    low: close,
    close,
    volume: 1,
  });

  it('takes the last close as price and the one before as previous close', () => {
    expect(quoteFromCandles('A', [candle('2024-01-02', 10), candle('2024-01-03', 11)])).toEqual({
      ticker: 'A',
      price: 11,
      previousClose: 10,
    });
  });

  it('uses the same close when there is a single candle', () => {
    expect(quoteFromCandles('A', [candle('2024-01-02', 10)]).previousClose).toBe(10);
  });
});
