import { startOfYear, subMonths, subYears } from 'date-fns';
import type { IsoDate } from '@/shared/model';
import { parseIsoDate, toIsoDate } from '../date';

export const HISTORY_RANGES = ['1M', '3M', '6M', 'YTD', '1Y', 'ALL'] as const;
export type HistoryRange = (typeof HISTORY_RANGES)[number];

export function isHistoryRange(value: unknown): value is HistoryRange {
  return HISTORY_RANGES.some((range) => range === value);
}

/** Первая дата периода (включительно) или `null` для ALL. */
export function rangeStartDate(range: HistoryRange, today: IsoDate): IsoDate | null {
  const now = parseIsoDate(today);
  switch (range) {
    case '1M':
      return toIsoDate(subMonths(now, 1));
    case '3M':
      return toIsoDate(subMonths(now, 3));
    case '6M':
      return toIsoDate(subMonths(now, 6));
    case 'YTD':
      return toIsoDate(startOfYear(now));
    case '1Y':
      return toIsoDate(subYears(now, 1));
    case 'ALL':
      return null;
  }
}

export function filterByRange<T extends { date: IsoDate }>(
  points: readonly T[],
  range: HistoryRange,
  today: IsoDate,
): T[] {
  const start = rangeStartDate(range, today);
  return start === null ? [...points] : points.filter((p) => p.date >= start);
}
