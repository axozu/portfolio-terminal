import { describe, expect, it } from 'vitest';
import type { PositionItem } from '@/shared/api';
import { describeHistory, orderAllocation, topMovers } from './selectors';

const position = (ticker: string, dayChangePct: number) =>
  ({ ticker, dayChangePct }) as PositionItem;

describe('topMovers', () => {
  const positions = [
    position('A', 0.03),
    position('B', -0.05),
    position('C', 0.01),
    position('D', 0),
    position('E', -0.01),
    position('F', 0.07),
  ];

  it('picks the biggest gainers and losers, ignoring flat ones', () => {
    const { gainers, losers } = topMovers(positions, 2);
    expect(gainers.map((p) => p.ticker)).toEqual(['F', 'A']);
    expect(losers.map((p) => p.ticker)).toEqual(['B', 'E']);
  });

  it('returns fewer items when there are not enough moves', () => {
    expect(topMovers([position('A', 0.01)], 4)).toEqual({
      gainers: [position('A', 0.01)],
      losers: [],
    });
  });
});

describe('orderAllocation', () => {
  it('keeps a fixed class order and color, regardless of size', () => {
    const ordered = orderAllocation([
      { key: 'cash', value: 50, weight: 0.5 },
      { key: 'crypto', value: 30, weight: 0.3 },
      { key: 'stock', value: 20, weight: 0.2 },
    ]);
    expect(ordered.map((s) => [s.key, s.slot])).toEqual([
      ['stock', '--chart-1'],
      ['crypto', '--chart-4'],
      ['cash', '--chart-5'],
    ]);
  });
});

describe('describeHistory', () => {
  it('summarizes the first and last points', () => {
    expect(
      describeHistory([
        { date: '2026-01-02', value: 100, netInvested: 100, benchmark: 100 },
        { date: '2026-06-01', value: 125, netInvested: 100, benchmark: 110 },
      ]),
    ).toEqual({
      from: '2026-01-02',
      to: '2026-06-01',
      start: 100,
      end: 125,
      change: 0.25,
      benchmarkEnd: 110,
    });
  });

  it('returns null for an empty history', () => {
    expect(describeHistory([])).toBeNull();
  });
});
