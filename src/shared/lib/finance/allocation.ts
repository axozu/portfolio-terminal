import type { Asset, AssetClass, Sector } from '@/shared/model';
import type { Position } from './positions';

export interface AllocationSlice<K extends string> {
  key: K;
  value: number;
  /** Доля от суммы всех срезов. */
  weight: number;
}

/** Группирует значения по ключу, считает доли и сортирует по убыванию. */
export function allocate<K extends string>(
  items: Iterable<{ key: K; value: number }>,
): AllocationSlice<K>[] {
  const totals = new Map<K, number>();
  for (const { key, value } of items) totals.set(key, (totals.get(key) ?? 0) + value);
  let total = 0;
  for (const value of totals.values()) total += value;
  return [...totals]
    .map(([key, value]) => ({ key, value, weight: total > 0 ? value / total : 0 }))
    .filter((slice) => slice.value > 0)
    .sort((a, b) => b.value - a.value);
}

function requireAsset(assets: ReadonlyMap<string, Asset>, ticker: string): Asset {
  const asset = assets.get(ticker);
  if (!asset) throw new Error(`Unknown asset ${ticker}`);
  return asset;
}

/** Распределение по классам активов, кэш — отдельным срезом. */
export function allocationByClass(
  positions: readonly Position[],
  assets: ReadonlyMap<string, Asset>,
  cash: number,
): AllocationSlice<AssetClass | 'cash'>[] {
  return allocate<AssetClass | 'cash'>([
    ...positions.map((p) => ({ key: requireAsset(assets, p.ticker).class, value: p.marketValue })),
    { key: 'cash', value: cash },
  ]);
}

/**
 * Распределение по секторам (без кэша). У крипты и облигационных фондов сектора нет —
 * они группируются по классу актива.
 */
export function allocationBySector(
  positions: readonly Position[],
  assets: ReadonlyMap<string, Asset>,
): AllocationSlice<Sector | AssetClass>[] {
  return allocate<Sector | AssetClass>(
    positions.map((p) => {
      const asset = requireAsset(assets, p.ticker);
      return { key: asset.sector ?? asset.class, value: p.marketValue };
    }),
  );
}
