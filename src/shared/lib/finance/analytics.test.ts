import { describe, expect, it } from 'vitest';
import { createTxFactory } from '@/test/fixtures/transactions';
import {
  annualizedVolatility,
  dailyReturns,
  dividendsByMonth,
  drawdownSeries,
  maxDrawdown,
  monthlyReturns,
  monthsBetween,
  sharpeRatio,
} from './analytics';
import type { ValuePoint } from './history';

const point = (date: string, value: number, netFlow = 0): ValuePoint => ({
  date,
  value,
  netFlow,
  cash: 0,
  netInvested: 0,
});

// Доходности: +10%, −10%, затем +10/99 при пополнении 50 в последний день.
const history = [
  point('2024-01-30', 100, 100),
  point('2024-01-31', 110),
  point('2024-02-01', 99),
  point('2024-02-02', 159, 50),
];

describe('dailyReturns', () => {
  it('excludes deposits and withdrawals from the return', () => {
    const returns = dailyReturns(history).map((r) => r.value);
    expect(returns[0]).toBeCloseTo(0.1, 12);
    expect(returns[1]).toBeCloseTo(-0.1, 12);
    expect(returns[2]).toBeCloseTo(109 / 99 - 1, 12);
  });

  it('skips days after an empty portfolio', () => {
    expect(dailyReturns([point('2024-01-01', 0), point('2024-01-02', 100, 100)])).toEqual([]);
  });
});

describe('monthlyReturns', () => {
  it('chains daily returns within a month and sums P/L net of flows', () => {
    const [jan, feb] = monthlyReturns(history);
    expect(jan?.month).toBe('2024-01');
    expect(jan?.return).toBeCloseTo(0.1, 12);
    expect(jan?.pnl).toBeCloseTo(10, 12);
    expect(feb?.month).toBe('2024-02');
    expect(feb?.return).toBeCloseTo(0.9 * (109 / 99) - 1, 12);
    expect(feb?.pnl).toBeCloseTo(-11 + 10, 12);
  });
});

describe('drawdown', () => {
  it('measures the fall of the wealth index from its running peak', () => {
    const series = drawdownSeries(history).map((p) => p.value);
    expect(series[0]).toBe(0);
    expect(series[1]).toBe(0);
    expect(series[2]).toBeCloseTo(0.99 / 1.1 - 1, 12); // −10%
    expect(series[3]).toBeCloseTo((0.99 * (109 / 99)) / 1.1 - 1, 12);
  });

  it('is not hidden by a deposit', () => {
    // Стоимость растёт только из-за пополнения — просадка остаётся.
    const withDeposit = [
      point('2024-01-01', 100, 100),
      point('2024-01-02', 80),
      point('2024-01-03', 180, 100),
    ];
    expect(maxDrawdown(withDeposit)).toBeCloseTo(-0.2, 12);
  });

  it('returns the deepest drawdown', () => {
    expect(maxDrawdown(history)).toBeCloseTo(-0.1, 12);
    expect(maxDrawdown([])).toBe(0);
  });
});

describe('risk metrics', () => {
  const returns = (values: number[]) => values.map((value, i) => ({ date: String(i), value }));

  it('annualizes volatility with √252', () => {
    // σ([0.01, −0.01]) = √0.0002
    expect(annualizedVolatility(returns([0.01, -0.01]))).toBeCloseTo(
      Math.sqrt(0.0002) * Math.sqrt(252),
      12,
    );
    expect(annualizedVolatility(returns([0.01]))).toBeNull();
  });

  it('computes Sharpe with a 4% risk-free rate', () => {
    const vol = Math.sqrt(0.000002) * Math.sqrt(252); // σ([0.002, 0.004]) = √0.000002
    expect(sharpeRatio(returns([0.002, 0.004]))).toBeCloseTo((0.003 * 252 - 0.04) / vol, 9);
  });

  it('returns null Sharpe for zero volatility', () => {
    expect(sharpeRatio(returns([0.001, 0.001]))).toBeNull();
  });
});

describe('dividendsByMonth', () => {
  it('sums dividends per month and fills gaps with zeros', () => {
    const tx = createTxFactory();
    expect(
      dividendsByMonth([
        tx.dividend('2024-01-15', 'KO', 10),
        tx.deposit('2024-02-01', 1_000),
        tx.dividend('2024-03-01', 'KO', 5),
        tx.dividend('2024-03-20', 'JNJ', 2),
      ]),
    ).toEqual([
      { month: '2024-01', amount: 10 },
      { month: '2024-02', amount: 0 },
      { month: '2024-03', amount: 7 },
    ]);
  });

  it('returns an empty list without dividends', () => {
    expect(dividendsByMonth([])).toEqual([]);
  });
});

describe('monthsBetween', () => {
  it('crosses a year boundary', () => {
    expect(monthsBetween('2024-11', '2025-02')).toEqual([
      '2024-11',
      '2024-12',
      '2025-01',
      '2025-02',
    ]);
  });
});
