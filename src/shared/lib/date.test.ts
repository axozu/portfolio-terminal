import { describe, expect, it } from 'vitest';
import { addDaysIso, lastTradingDayOnOrBefore, monthOf, tradingDaysBetween } from './date';

describe('date helpers', () => {
  it('extracts the month', () => {
    expect(monthOf('2025-03-17')).toBe('2025-03');
  });

  it('adds days across month and year boundaries', () => {
    expect(addDaysIso('2024-12-31', 1)).toBe('2025-01-01');
    expect(addDaysIso('2024-03-01', -1)).toBe('2024-02-29');
  });

  it('adds days across a DST switch without skipping', () => {
    // Европейский переход на летнее время — 30.03.2025.
    expect(addDaysIso('2025-03-29', 2)).toBe('2025-03-31');
  });

  it('lists weekdays only, inclusive', () => {
    // 2025-11-21 — пятница, 2025-11-24 — понедельник.
    expect(tradingDaysBetween('2025-11-21', '2025-11-25')).toEqual([
      '2025-11-21',
      '2025-11-24',
      '2025-11-25',
    ]);
  });

  it('finds the last trading day on or before a date', () => {
    expect(lastTradingDayOnOrBefore('2025-11-23')).toBe('2025-11-21'); // воскресенье → пятница
    expect(lastTradingDayOnOrBefore('2025-11-24')).toBe('2025-11-24');
  });
});
