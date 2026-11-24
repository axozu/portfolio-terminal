import type { DatedValue, MonthlyAmount } from '@/shared/lib/finance';

/** Сумма дивидендов за последние `months` месяцев ряда. */
export function trailingDividends(byMonth: readonly MonthlyAmount[], months = 12): number {
  return byMonth.slice(-months).reduce((acc, m) => acc + m.amount, 0);
}

export interface DividendsSummary {
  from: string;
  to: string;
  total: number;
  maxMonth: string;
  max: number;
}

export function summarizeDividends(byMonth: readonly MonthlyAmount[]): DividendsSummary | null {
  const first = byMonth[0];
  const last = byMonth.at(-1);
  if (!first || !last) return null;
  const best = byMonth.reduce((a, b) => (b.amount > a.amount ? b : a), first);
  return {
    from: first.month,
    to: last.month,
    total: byMonth.reduce((acc, m) => acc + m.amount, 0),
    maxMonth: best.month,
    max: best.amount,
  };
}

export interface DrawdownSummary {
  maxDate: string;
  max: number;
  current: number;
}

export function summarizeDrawdown(series: readonly DatedValue[]): DrawdownSummary | null {
  const first = series[0];
  const last = series.at(-1);
  if (!first || !last) return null;
  const deepest = series.reduce((a, b) => (b.value < a.value ? b : a), first);
  return { maxDate: deepest.date, max: deepest.value, current: last.value };
}
