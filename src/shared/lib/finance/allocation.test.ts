import { describe, expect, it } from 'vitest';
import type { Asset } from '@/shared/model';
import { allocate, allocationByClass, allocationBySector } from './allocation';
import type { Position } from './positions';

const position = (ticker: string, marketValue: number): Position => ({
  ticker,
  marketValue,
  quantity: 1,
  averagePrice: marketValue,
  costBasis: marketValue,
  currentPrice: marketValue,
  previousClose: marketValue,
  unrealizedPnl: 0,
  unrealizedPnlPct: 0,
  dayChange: 0,
  dayChangePct: 0,
  weight: 0,
  realizedPnl: 0,
  dividends: 0,
});

const assets = new Map<string, Asset>(
  (
    [
      ['AAPL', 'stock', 'technology'],
      ['MSFT', 'stock', 'technology'],
      ['JNJ', 'stock', 'healthcare'],
      ['BTC', 'crypto', null],
      ['BND', 'bond', null],
    ] as const
  ).map(([ticker, cls, sector]) => [
    ticker,
    { ticker, name: ticker, class: cls, sector, quantityPrecision: 4 },
  ]),
);

const positions = [
  position('AAPL', 300),
  position('MSFT', 200),
  position('JNJ', 100),
  position('BTC', 250),
  position('BND', 150),
];

describe('allocate', () => {
  it('groups, weights and sorts by value', () => {
    expect(
      allocate([
        { key: 'a', value: 1 },
        { key: 'b', value: 3 },
        { key: 'a', value: 4 },
      ]),
    ).toEqual([
      { key: 'a', value: 5, weight: 5 / 8 },
      { key: 'b', value: 3, weight: 3 / 8 },
    ]);
  });

  it('drops empty slices', () => {
    expect(allocate([{ key: 'cash', value: 0 }])).toEqual([]);
  });
});

describe('allocationByClass', () => {
  it('includes cash as its own slice and sums to one', () => {
    const slices = allocationByClass(positions, assets, 1_000);
    expect(slices.map((s) => [s.key, s.value])).toEqual([
      ['cash', 1_000],
      ['stock', 600],
      ['crypto', 250],
      ['bond', 150],
    ]);
    expect(slices.reduce((acc, s) => acc + s.weight, 0)).toBeCloseTo(1, 12);
  });
});

describe('allocationBySector', () => {
  it('uses the asset class when there is no sector', () => {
    expect(allocationBySector(positions, assets).map((s) => [s.key, s.value])).toEqual([
      ['technology', 500],
      ['crypto', 250],
      ['bond', 150],
      ['healthcare', 100],
    ]);
  });

  it('throws on an unknown ticker', () => {
    expect(() => allocationBySector([position('XYZ', 1)], assets)).toThrow(/XYZ/);
  });
});
