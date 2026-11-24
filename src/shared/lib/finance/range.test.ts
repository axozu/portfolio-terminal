import { describe, expect, it } from 'vitest';
import { filterByRange, isHistoryRange, rangeStartDate } from './range';

describe('rangeStartDate', () => {
  it.each([
    ['1M', '2025-10-24'],
    ['3M', '2025-08-24'],
    ['6M', '2025-05-24'],
    ['YTD', '2025-01-01'],
    ['1Y', '2024-11-24'],
    ['ALL', null],
  ] as const)('%s → %s', (range, expected) => {
    expect(rangeStartDate(range, '2025-11-24')).toBe(expected);
  });

  it('clamps to the end of a shorter month', () => {
    expect(rangeStartDate('1M', '2025-03-31')).toBe('2025-02-28');
  });
});

describe('filterByRange', () => {
  const points = [{ date: '2024-12-31' }, { date: '2025-01-01' }, { date: '2025-06-01' }];

  it('keeps points from the start date inclusive', () => {
    expect(filterByRange(points, 'YTD', '2025-11-24')).toEqual(points.slice(1));
  });

  it('keeps everything for ALL', () => {
    expect(filterByRange(points, 'ALL', '2025-11-24')).toEqual(points);
  });
});

describe('isHistoryRange', () => {
  it('validates query values', () => {
    expect(isHistoryRange('YTD')).toBe(true);
    expect(isHistoryRange('2Y')).toBe(false);
    expect(isHistoryRange(undefined)).toBe(false);
  });
});
