import { addDays, format, isWeekend, parseISO } from 'date-fns';
import type { IsoDate, IsoMonth } from '@/shared/model';

/**
 * Даты в домене — строки `YYYY-MM-DD`. Они сравниваются лексикографически
 * и не зависят от таймзоны. `Date` используется только внутри этих хелперов
 * (локальная полночь, поэтому переходы на летнее время не сдвигают дни).
 */

export function toIsoDate(date: Date): IsoDate {
  return format(date, 'yyyy-MM-dd');
}

export function parseIsoDate(date: IsoDate): Date {
  return parseISO(date);
}

export function monthOf(date: IsoDate): IsoMonth {
  return date.slice(0, 7);
}

export function addDaysIso(date: IsoDate, days: number): IsoDate {
  return toIsoDate(addDays(parseIsoDate(date), days));
}

export function isTradingDay(date: IsoDate): boolean {
  return !isWeekend(parseIsoDate(date));
}

/**
 * Торговые дни (пн–пт) в диапазоне `[from, to]` включительно.
 * Праздники не моделируются; крипта для единообразия тоже «торгуется» по будням.
 */
export function tradingDaysBetween(from: IsoDate, to: IsoDate): IsoDate[] {
  const days: IsoDate[] = [];
  let cursor = parseIsoDate(from);
  const end = parseIsoDate(to);
  while (cursor <= end) {
    if (!isWeekend(cursor)) {
      days.push(toIsoDate(cursor));
    }
    cursor = addDays(cursor, 1);
  }
  return days;
}

/** Последний торговый день не позже `date`. */
export function lastTradingDayOnOrBefore(date: IsoDate): IsoDate {
  let cursor = date;
  while (!isTradingDay(cursor)) {
    cursor = addDaysIso(cursor, -1);
  }
  return cursor;
}

/** `count` последних торговых дней, заканчивая `end` (включительно), по возрастанию. */
export function tradingDaysEndingAt(end: IsoDate, count: number): IsoDate[] {
  const days: IsoDate[] = [];
  let cursor = parseIsoDate(end);
  while (days.length < count) {
    if (!isWeekend(cursor)) days.push(toIsoDate(cursor));
    cursor = addDays(cursor, -1);
  }
  return days.reverse();
}
