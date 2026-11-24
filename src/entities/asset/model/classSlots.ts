import type { ChartSlot } from '@/shared/ui/charts';
import type { AssetClass } from '@/shared/model';

/**
 * Фиксированный порядок и цвет классов активов на всех графиках.
 * Цвет закреплён за сущностью, а не за местом по величине, поэтому
 * «крипта» одинакового цвета в любом состоянии портфеля.
 */
export const CLASS_ORDER = ['stock', 'etf', 'bond', 'crypto', 'cash'] as const satisfies readonly (
  AssetClass | 'cash'
)[];

export const CLASS_SLOTS: Record<AssetClass | 'cash', ChartSlot> = {
  stock: '--chart-1',
  etf: '--chart-2',
  bond: '--chart-3',
  crypto: '--chart-4',
  cash: '--chart-5',
};
