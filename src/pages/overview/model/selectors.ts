import { CLASS_ORDER, CLASS_SLOTS } from '@/entities/asset/model/classSlots';
import type { HistoryPoint, PositionItem } from '@/shared/api';
import type { AllocationSlice } from '@/shared/lib/finance';
import type { AssetClass } from '@/shared/model';
import type { ChartSlot } from '@/shared/ui/charts';

export interface Movers {
  gainers: PositionItem[];
  losers: PositionItem[];
}

/** Лидеры роста и падения за день: только реально выросшие/упавшие, по модулю изменения. */
export function topMovers(positions: readonly PositionItem[], limit = 4): Movers {
  const byChange = [...positions].sort((a, b) => b.dayChangePct - a.dayChangePct);
  return {
    gainers: byChange.filter((p) => p.dayChangePct > 0).slice(0, limit),
    losers: byChange
      .filter((p) => p.dayChangePct < 0)
      .reverse()
      .slice(0, limit),
  };
}

export interface ClassSlice {
  key: AssetClass | 'cash';
  value: number;
  weight: number;
  slot: ChartSlot;
}

/** Доли классов в фиксированном порядке и цветах (а не по убыванию). */
export function orderAllocation(
  slices: readonly AllocationSlice<AssetClass | 'cash'>[],
): ClassSlice[] {
  return CLASS_ORDER.flatMap((key) => {
    const slice = slices.find((s) => s.key === key);
    return slice ? [{ ...slice, slot: CLASS_SLOTS[key] }] : [];
  });
}

export interface HistoryDescription {
  from: string;
  to: string;
  start: number;
  end: number;
  /** Изменение стоимости за период, включая пополнения. */
  change: number;
  benchmarkEnd: number;
}

/** Данные для текстового резюме графика (для скринридеров). */
export function describeHistory(points: readonly HistoryPoint[]): HistoryDescription | null {
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last) return null;
  return {
    from: first.date,
    to: last.date,
    start: first.value,
    end: last.value,
    change: first.value > 0 ? last.value / first.value - 1 : 0,
    benchmarkEnd: last.benchmark,
  };
}
