import type { MonthlyReturn } from '@/shared/lib/finance';

export interface HeatmapRow {
  year: string;
  /** 12 ячеек (январь…декабрь); `null` — месяца нет в истории. */
  months: (number | null)[];
  /** Доходность за год: сцепленные месячные доходности. */
  total: number;
}

/** Месячные доходности → строки «год × 12 месяцев» по возрастанию лет. */
export function buildHeatmap(monthly: readonly MonthlyReturn[]): HeatmapRow[] {
  const byYear = new Map<string, (number | null)[]>();
  for (const { month, return: value } of monthly) {
    const [year = '', mon = '1'] = month.split('-');
    const row = byYear.get(year) ?? Array.from<number | null>({ length: 12 }).fill(null);
    row[Number(mon) - 1] = value;
    byYear.set(year, row);
  }
  return [...byYear.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, months]) => ({
      year,
      months,
      total: months.reduce<number>((acc, r) => (r === null ? acc : (1 + acc) * (1 + r) - 1), 0),
    }));
}

/** Насыщенность ячейки: |доходность| / предел, от 0 до 1. Выше предела — максимальная. */
export function heatIntensity(value: number, cap = 0.08): number {
  return Math.min(1, Math.abs(value) / cap);
}
