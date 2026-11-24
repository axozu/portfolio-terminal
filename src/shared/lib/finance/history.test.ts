import { describe, expect, it } from 'vitest';
import type { Candle } from '@/shared/model';
import { createTxFactory } from '@/test/fixtures/transactions';
import { benchmarkWithFlows, computeValueHistory } from './history';

const candle = (date: string, close: number): Candle => ({
  date,
  open: close,
  high: close,
  low: close,
  close,
  volume: 0,
});

describe('computeValueHistory', () => {
  const tx = createTxFactory();
  const candles = {
    // 2024-01-03 свечи нет — должна использоваться последняя известная цена.
    A: [candle('2024-01-01', 10), candle('2024-01-02', 12), candle('2024-01-04', 15)],
    B: [candle('2024-01-01', 1)],
  };
  const dates = ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04'];
  const history = computeValueHistory(
    [
      tx.deposit('2023-12-29', 500), // до первой даты → попадает в первую точку
      tx.deposit('2024-01-01', 500),
      tx.buy('2024-01-02', 'A', 10, 12), // −120
      tx.deposit('2024-01-04', 100),
      tx.withdrawal('2024-01-04', 30),
      tx.deposit('2024-01-05', 999), // после последней даты → не учитывается
    ],
    candles,
    dates,
  );

  it('produces one point per date', () => {
    expect(history.map((p) => p.date)).toEqual(dates);
  });

  it('values cash plus quantity × close on each date', () => {
    expect(history.map((p) => p.value)).toEqual([1_000, 1_000, 1_000, 1_000 - 120 + 70 + 150]);
    expect(history.map((p) => p.cash)).toEqual([1_000, 880, 880, 950]);
  });

  it('carries the last known close over missing candles', () => {
    expect(history[2]?.value).toBe(880 + 10 * 12);
  });

  it('records daily net flows and cumulative net invested', () => {
    expect(history.map((p) => p.netFlow)).toEqual([1_000, 0, 0, 70]);
    expect(history.map((p) => p.netInvested)).toEqual([1_000, 1_000, 1_000, 1_070]);
  });

  it('returns an empty history for no dates', () => {
    expect(computeValueHistory([], candles, [])).toEqual([]);
  });
});

describe('benchmarkWithFlows', () => {
  const point = (date: string, value: number, netFlow = 0) => ({
    date,
    value,
    netFlow,
    cash: 0,
    netInvested: 0,
  });

  it('invests the starting value and every later flow into the benchmark', () => {
    const closes = new Map([
      ['d1', 100],
      ['d2', 110],
      ['d3', 100],
    ]);
    const points = [point('d1', 1_000, 1_000), point('d2', 0), point('d3', 0, 500)];
    // d1: 10 ед. → 1000; d2: 10 × 110 = 1100; d3: +5 ед. → 15 × 100 = 1500
    expect(benchmarkWithFlows(points, closes)).toEqual([1_000, 1_100, 1_500]);
  });

  it('handles withdrawals and missing closes', () => {
    const closes = new Map([
      ['d1', 50],
      ['d3', 100],
    ]);
    const points = [point('d1', 1_000), point('d2', 0, -500), point('d3', 0)];
    // d1: 20 ед.; d2: цена 50 (перенос), −10 ед. → 500; d3: 10 × 100 = 1000
    expect(benchmarkWithFlows(points, closes)).toEqual([1_000, 500, 1_000]);
  });
});
