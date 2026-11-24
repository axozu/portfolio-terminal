import { describe, expect, it } from 'vitest';
import { summarizeDividends, summarizeDrawdown, trailingDividends } from './summaries';

const months = [
  { month: '2025-10', amount: 5 },
  { month: '2025-11', amount: 0 },
  { month: '2025-12', amount: 20 },
];

describe('dividends', () => {
  it('sums the trailing window', () => {
    expect(trailingDividends(months, 2)).toBe(20);
    expect(trailingDividends(months)).toBe(25);
  });

  it('summarizes the period and the best month', () => {
    expect(summarizeDividends(months)).toEqual({
      from: '2025-10',
      to: '2025-12',
      total: 25,
      maxMonth: '2025-12',
      max: 20,
    });
    expect(summarizeDividends([])).toBeNull();
  });
});

describe('summarizeDrawdown', () => {
  it('finds the deepest point and the current level', () => {
    expect(
      summarizeDrawdown([
        { date: 'a', value: 0 },
        { date: 'b', value: -0.2 },
        { date: 'c', value: -0.05 },
      ]),
    ).toEqual({ maxDate: 'b', max: -0.2, current: -0.05 });
  });
});
